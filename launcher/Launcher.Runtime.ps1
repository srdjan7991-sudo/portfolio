function Get-PortfolioLauncherPaths {
    param([Parameter(Mandatory)][string]$RepositoryRoot, [switch]$Installed)
    $root = [IO.Path]::GetFullPath($RepositoryRoot).TrimEnd('\').ToUpperInvariant()
    $algorithm = [Security.Cryptography.SHA256]::Create()
    try { $hash = [BitConverter]::ToString($algorithm.ComputeHash([Text.Encoding]::UTF8.GetBytes($root))).Replace('-', '').Substring(0, 24).ToLowerInvariant() }
    finally { $algorithm.Dispose() }
    $stateRoot = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) "PortfolioLauncher\frontend-demo-$hash"
    @{
        StateRoot = $stateRoot
        LogPath = Join-Path $stateRoot 'launcher.ndjson'
        PortPath = Join-Path $stateRoot 'port.txt'
        MutexName = if ($Installed) { 'Local\SrdjanPajicPortfolioInstalled-v1' } else { "Local\PortfolioFrontendDemo-$hash" }
    }
}

function Write-PortfolioLog {
    param($Paths, [string]$Level, [string]$Message, [string]$Detail = '')
    $entry = @{ Timestamp = [DateTimeOffset]::Now.ToString('o'); Level = $Level; Message = $Message; Detail = $Detail }
    try { Add-Content -LiteralPath $Paths.LogPath -Value ($entry | ConvertTo-Json -Compress) -Encoding UTF8 -ErrorAction Stop }
    catch { Write-Warning 'Could not write launcher diagnostics.' }
}

function Read-PortfolioLauncherLog {
    param([string]$Path)
    foreach ($line in @(Get-Content -LiteralPath $Path -Encoding UTF8 -Tail 200 -ErrorAction SilentlyContinue)) {
        try { ConvertFrom-Json -InputObject $line -ErrorAction Stop }
        catch { continue }
    }
}

function Get-PortfolioLauncherUrl {
    param($Server)
    return "http://127.0.0.1:$($Server.Port)/"
}

function Start-PortfolioServer {
    param($Paths, [string]$Directory, [ref]$FallbackUsed)
    $marker = Join-Path $Directory '.portfolio-windows-demo'
    if (!(Test-Path -LiteralPath (Join-Path $Directory 'index.html') -PathType Leaf) -or
        !(Test-Path -LiteralPath $marker -PathType Leaf) -or
        ([IO.File]::ReadAllText($marker)).Trim() -ne 'portfolio-windows-demo-v1') {
        throw 'The installed portfolio files are missing. Run Portfolio-Setup.exe again.'
    }
    if (!('PortfolioLauncher.StaticServer' -as [type])) {
        Add-Type -Path (Join-Path $PSScriptRoot 'Launcher.StaticServer.cs') -ErrorAction Stop
    }

    # Keep a stable browser origin for this checkout even when the first start needed another port.
    $preferred = 4378
    if (Test-Path -LiteralPath $Paths.PortPath -PathType Leaf) {
        $stored = 0
        if ([int]::TryParse([IO.File]::ReadAllText($Paths.PortPath), [ref]$stored) -and $stored -ge 1024 -and $stored -le 65535) {
            $preferred = $stored
        }
    }
    try { $server = [PortfolioLauncher.StaticServer]::new($Directory, $preferred) }
    catch {
        $errorSource = $_.Exception.GetBaseException()
        if ($errorSource -isnot [Net.Sockets.SocketException] -or
            $errorSource.SocketErrorCode -notin @([Net.Sockets.SocketError]::AddressAlreadyInUse, [Net.Sockets.SocketError]::AccessDenied)) { throw }
        $server = [PortfolioLauncher.StaticServer]::new($Directory, 0)
        if ($FallbackUsed) { $FallbackUsed.Value = $true }
        Write-PortfolioLog $Paths 'Info' 'The usual local port was unavailable.' (Get-PortfolioLauncherUrl $server)
    }
    try { [IO.File]::WriteAllText($Paths.PortPath, [string]$server.Port) }
    catch { Write-PortfolioLog $Paths 'Warning' 'Could not remember the local port.' }
    return $server
}
