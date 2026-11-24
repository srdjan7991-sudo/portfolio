using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace PortfolioLauncher
{
    public sealed class StaticServer : IDisposable
    {
        private const int RequestLimit = 16384;
        private const int TimeoutMilliseconds = 3000;
        private const int ConcurrentClients = 24;
        private static readonly Dictionary<string, string> MediaTypes =
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { ".html", "text/html; charset=utf-8" },
                { ".css", "text/css; charset=utf-8" },
                { ".js", "text/javascript; charset=utf-8" },
                { ".json", "application/json; charset=utf-8" },
                { ".svg", "image/svg+xml" },
                { ".ico", "image/x-icon" },
                { ".png", "image/png" },
                { ".jpg", "image/jpeg" },
                { ".jpeg", "image/jpeg" },
                { ".webp", "image/webp" },
                { ".avif", "image/avif" },
                { ".woff", "font/woff" },
                { ".woff2", "font/woff2" },
                { ".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
            };

        private readonly string root;
        private readonly TcpListener listener;
        private readonly Thread acceptThread;
        private readonly HashSet<TcpClient> clients = new HashSet<TcpClient>();
        private readonly string instanceId = Guid.NewGuid().ToString("N");
        private volatile bool disposed;

        public StaticServer(string directory, int port)
        {
            root = Path.GetFullPath(directory).TrimEnd(Path.DirectorySeparatorChar);
            if (!IsRegularEntry(root) || !File.Exists(Path.Combine(root, "index.html")))
                throw new DirectoryNotFoundException("The bundled portfolio directory is unavailable.");

            listener = new TcpListener(IPAddress.Loopback, port);
            listener.ExclusiveAddressUse = true;
            try
            {
                listener.Start(32);
                Port = ((IPEndPoint)listener.LocalEndpoint).Port;
                acceptThread = new Thread(AcceptClients) { IsBackground = true };
                acceptThread.Start();
            }
            catch
            {
                listener.Stop();
                throw;
            }
        }

        public int Port { get; private set; }

        public Task<bool> ProbeAsync()
        {
            return Task.Run(new Func<bool>(Probe));
        }

        private bool Probe()
        {
            try
            {
                var request = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + Port + "/");
                request.Proxy = null;
                request.KeepAlive = false;
                request.AllowAutoRedirect = false;
                request.Timeout = TimeoutMilliseconds;
                request.ReadWriteTimeout = TimeoutMilliseconds;
                using (var response = (HttpWebResponse)request.GetResponse())
                {
                    // Confirm the real entry point and the instance bound by this launcher.
                    return response.StatusCode == HttpStatusCode.OK && response.ContentLength > 0
                        && response.ContentType.StartsWith("text/html", StringComparison.OrdinalIgnoreCase)
                        && response.Headers["X-Portfolio-Instance"] == instanceId;
                }
            }
            catch (WebException) { return false; }
        }

        private void AcceptClients()
        {
            while (!disposed)
            {
                TcpClient client;
                try { client = listener.AcceptTcpClient(); }
                catch (SocketException) { return; }
                catch (ObjectDisposedException) { return; }

                lock (clients)
                {
                    if (disposed || clients.Count >= ConcurrentClients)
                    {
                        client.Close();
                        continue;
                    }
                    clients.Add(client);
                }
                ThreadPool.QueueUserWorkItem(state => Serve((TcpClient)state), client);
            }
        }

        private void Serve(TcpClient client)
        {
            try
            {
                using (client)
                {
                    client.SendTimeout = TimeoutMilliseconds;
                    using (var stream = client.GetStream())
                    {
                        var request = ReadRequest(stream);
                        if (request == null) return;

                        string[] lines = request.Split(new[] { "\r\n" }, StringSplitOptions.None);
                        string[] line = lines[0].Split(' ');
                        if (line.Length != 3 || (line[2] != "HTTP/1.1" && line[2] != "HTTP/1.0"))
                        {
                            WriteResponse(stream, "400 Bad Request", null, 0);
                            return;
                        }

                        string host = null;
                        for (int index = 1; index < lines.Length && lines[index].Length > 0; index++)
                        {
                            int colon = lines[index].IndexOf(':');
                            if (colon < 1)
                            {
                                WriteResponse(stream, "400 Bad Request", null, 0);
                                return;
                            }
                            if (!lines[index].Substring(0, colon).Equals("Host", StringComparison.OrdinalIgnoreCase))
                                continue;
                            if (host != null)
                            {
                                WriteResponse(stream, "400 Bad Request", null, 0);
                                return;
                            }
                            host = lines[index].Substring(colon + 1).Trim();
                        }
                        if (host != "127.0.0.1:" + Port && !(host == null && line[2] == "HTTP/1.0"))
                        {
                            WriteResponse(stream, "400 Bad Request", null, 0);
                            return;
                        }
                        if (line[0] != "GET" && line[0] != "HEAD")
                        {
                            WriteResponse(stream, "405 Method Not Allowed", null, 0);
                            return;
                        }

                        string path = ResolveFile(line[1]);
                        string mediaType;
                        if (path == null || !MediaTypes.TryGetValue(Path.GetExtension(path), out mediaType))
                        {
                            WriteResponse(stream, "404 Not Found", null, 0);
                            return;
                        }
                        using (var file = File.OpenRead(path))
                        {
                            WriteResponse(stream, "200 OK", mediaType, file.Length);
                            if (line[0] == "GET") file.CopyTo(stream);
                        }
                    }
                }
            }
            catch (IOException) { } // Connection or file changed while serving.
            catch (SocketException) { }
            catch (ObjectDisposedException) { } // Stop closes active clients.
            catch (UnauthorizedAccessException) { }
            finally
            {
                lock (clients) { clients.Remove(client); }
            }
        }

        private static string ReadRequest(NetworkStream stream)
        {
            var buffer = new byte[RequestLimit];
            var timeout = Stopwatch.StartNew();
            int length = 0;
            while (length < buffer.Length && timeout.ElapsedMilliseconds < TimeoutMilliseconds)
            {
                stream.ReadTimeout = Math.Max(1, TimeoutMilliseconds - (int)timeout.ElapsedMilliseconds);
                int read = stream.Read(buffer, length, buffer.Length - length);
                if (read == 0) return null;
                int end = length + read;
                for (int index = Math.Max(0, length - 3); index < end - 3; index++)
                {
                    if (buffer[index] == 13 && buffer[index + 1] == 10
                        && buffer[index + 2] == 13 && buffer[index + 3] == 10)
                        return Encoding.ASCII.GetString(buffer, 0, index);
                }
                length = end;
            }
            return null;
        }

        private string ResolveFile(string target)
        {
            int query = target.IndexOf('?');
            if (query >= 0) target = target.Substring(0, query);
            if (target == "/") target = "/index.html";
            if (!target.StartsWith("/", StringComparison.Ordinal)) return null;
            string current = root;
            foreach (string segment in target.Substring(1).Split('/'))
            {
                string name = Uri.UnescapeDataString(segment);
                if (name.Length == 0 || name[0] == '.' || name[name.Length - 1] == '.' || name[name.Length - 1] == ' '
                    || name.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0 || name.IndexOfAny(new[] { '/', '\\' }) >= 0)
                    return null;
                current = Path.Combine(current, name);
                if (!IsRegularEntry(current)) return null;
            }
            return File.Exists(current) ? current : null;
        }

        private static bool IsRegularEntry(string path)
        {
            try { return (File.GetAttributes(path) & FileAttributes.ReparsePoint) == 0; }
            catch (IOException) { return false; }
            catch (UnauthorizedAccessException) { return false; }
        }

        private void WriteResponse(NetworkStream stream, string status, string mediaType, long length)
        {
            string header = "HTTP/1.1 " + status + "\r\nConnection: close\r\nContent-Length: "
                + length.ToString(CultureInfo.InvariantCulture) + "\r\nCache-Control: no-cache\r\n"
                + "X-Content-Type-Options: nosniff\r\n";
            if (mediaType != null)
                header += "Content-Type: " + mediaType + "\r\nX-Portfolio-Instance: " + instanceId + "\r\n";
            if (status.StartsWith("405", StringComparison.Ordinal)) header += "Allow: GET, HEAD\r\n";
            byte[] bytes = Encoding.ASCII.GetBytes(header + "\r\n");
            stream.Write(bytes, 0, bytes.Length);
        }

        public void Dispose()
        {
            lock (clients)
            {
                if (disposed) return;
                disposed = true;
                listener.Stop();
                foreach (TcpClient client in clients) client.Close();
            }
            acceptThread.Join();
        }
    }
}
