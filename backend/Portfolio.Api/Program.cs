using System.Net;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Portfolio.Api.Auth;
using Portfolio.Api.Data;
using Portfolio.Api.Documentation;
using Portfolio.Api.Sections;

var recoverAdmin = args.Contains("--recover-admin", StringComparer.Ordinal);
if (recoverAdmin && args.Length != 1)
{
    Console.Error.WriteLine("Use --recover-admin by itself and load configuration from the host environment.");
    Environment.ExitCode = 1;
    return;
}

var builder = WebApplication.CreateBuilder(recoverAdmin ? [] : args);
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<SqlUnavailableHandler>();
builder.Services.PostConfigure<ForwardedHeadersOptions>(options =>
{
    var configured = builder.Configuration.GetSection("ReverseProxy:KnownProxies").Get<string[]>();
    var proxies = configured?.Select(IPAddress.Parse).ToArray() ??
        (builder.Environment.IsDevelopment() ? [IPAddress.Loopback, IPAddress.IPv6Loopback] : []);
    options.ForwardedHeaders = proxies.Length == 0 ? ForwardedHeaders.None : ForwardedHeaders.XForwardedFor;
    options.ForwardLimit = 1;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
    foreach (var proxy in proxies) options.KnownProxies.Add(proxy);
});
builder.Services.AddDbContext<PortfolioDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Portfolio")));
builder.AddPortfolioAuth();
if (builder.Environment.IsDevelopment()) builder.Services.AddPortfolioSwagger();

var app = builder.Build();
if (recoverAdmin)
{
    await using (app)
    {
        Environment.ExitCode = await AdminRecovery.RunAsync(app.Services);
    }
    return;
}

app.UseExceptionHandler();
app.UseForwardedHeaders();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapGet("/health", () => TypedResults.Ok(new { Status = "healthy" }))
    .WithSummary("Check whether the API is running");
app.MapPortfolioSections();
app.MapPortfolioAuth();
app.Run();

public partial class Program;
