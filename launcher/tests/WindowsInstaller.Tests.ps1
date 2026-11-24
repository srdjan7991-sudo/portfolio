#Requires -Version 5.1
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$InstallerPath,
    [string]$ScratchParent = [IO.Path]::GetTempPath()
)

$ErrorActionPreference = 'Stop'
$installer = (Resolve-Path -LiteralPath $InstallerPath).Path
$scratch = (Resolve-Path -LiteralPath $ScratchParent).Path
$testDirectory = [IO.Path]::GetFullPath((Join-Path $scratch ('Portfolio installer test ' + [Guid]::NewGuid().ToString('N'))))
if ((Split-Path $testDirectory -Parent) -ne $scratch.TrimEnd('\')) { throw 'Invalid installer test directory.' }
$installDirectory = Join-Path $testDirectory 'Installed Portfolio'
$installLog = Join-Path $testDirectory 'install.log'
$uninstallLog = Join-Path $testDirectory 'uninstall.log'
$uninstallSubkey = 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{0EB81974-1C48-4C8B-91C0-F39DAADED150}_is1'
$uninstallKey = 'HKCU:\' + $uninstallSubkey
$shortcuts = @(
    Join-Path ([Environment]::GetFolderPath('DesktopDirectory', 'DoNotVerify')) 'Portfolio Launcher.lnk'
    Join-Path ([Environment]::GetFolderPath('Programs', 'DoNotVerify')) 'Portfolio Launcher.lnk'
)
$powerShellPaths = @(
    Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    Join-Path $env:SystemRoot 'SysWOW64\WindowsPowerShell\v1.0\powershell.exe'
)
$launcher = Join-Path $installDirectory 'launcher\Launcher.ps1'
$launcherArguments = "-NoLogo -NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcher`" -Installed"

function Test-PortfolioRegistration {
    try { $registration = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey($uninstallSubkey) }
    catch { throw 'The installer test could not read current-user Installed Apps registration. Use a clean Windows test account with normal user-profile access.' }
    if (!$registration) { return $false }
    $registration.Dispose()
    return $true
}

if ((Test-PortfolioRegistration) -or ($shortcuts | Where-Object { Test-Path -LiteralPath $_ })) {
    throw 'The installer test needs a Windows account without an existing Portfolio installation or shortcuts.'
}

function Invoke-TestInstallerStep([string]$Path, [string]$Arguments, [string]$Log) {
    $process = Start-Process -FilePath $Path -ArgumentList $Arguments -Wait -PassThru -WindowStyle Hidden
    try {
        if ($process.ExitCode -ne 0) {
            $details = if (Test-Path -LiteralPath $Log) {
                $lines = Get-Content -LiteralPath $Log
                $errors = @($lines | Where-Object { $_ -match 'error|failed|denied|exception' } | Select-Object -Last 12)
                $(if ($errors) { $errors } else { $lines | Select-Object -Last 12 }) -join "`n"
            }
            throw "$([IO.Path]::GetFileName($Path)) exited with code $($process.ExitCode).`n$details"
        }
    } finally { $process.Dispose() }
}

function Get-TestUninstaller {
    if (!(Test-Path -LiteralPath $installDirectory -PathType Container)) { return }
    $files = @(Get-ChildItem -LiteralPath $installDirectory -Filter 'unins*.exe' -File)
    if ($files.Count -eq 1) { return $files[0].FullName }
}

function Assert-Asset([Net.Http.HttpClient]$Client, [uri]$Url, [string]$Asset, [string]$MediaType) {
    $response = $Client.GetAsync([uri]::new($Url, $Asset)).GetAwaiter().GetResult()
    try {
        if (!$response.IsSuccessStatusCode -or $response.Content.Headers.ContentType.MediaType -ne $MediaType) {
            throw "The installed demo did not serve $Asset with its expected content type."
        }
    } finally { $response.Dispose() }
}

Add-Type -AssemblyName System.Net.Http
[void][IO.Directory]::CreateDirectory($testDirectory)
$sentinel = Join-Path $testDirectory 'unrelated.txt'
[IO.File]::WriteAllText($sentinel, 'Preserve this file.')
$originalPath = $env:PATH
$server = $null
$client = $null
$paths = $null
$independent = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
$completed = $false

try {
    # Hosted runners can have developer tools in System32. Start the EXEs by absolute path.
    $env:PATH = $testDirectory
    foreach ($tool in 'node.exe', 'npm.cmd', 'dotnet.exe', 'docker.exe', 'sqlcmd.exe', 'git.exe') {
        if (Get-Command $tool -ErrorAction SilentlyContinue) { throw "$tool is reachable on the smoke-test PATH." }
    }

    Invoke-TestInstallerStep $installer "/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SP- /DIR=`"$installDirectory`" /LOG=`"$installLog`"" $installLog
    $uninstaller = Get-TestUninstaller
    if (!$uninstaller -or !(Test-Path -LiteralPath $launcher -PathType Leaf)) {
        throw 'The installer did not create the launcher and a single uninstaller.'
    }
    $registered = Get-ItemProperty -LiteralPath $uninstallKey
    if ($registered.DisplayName -ne 'Srdjan Pajic Portfolio' -or
        ([string]$registered.InstallLocation).TrimEnd('\') -ne $installDirectory -or
        $registered.UninstallString -ne ('"' + $uninstaller + '"')) {
        throw 'The current-user Installed Apps registration does not identify this installation.'
    }

    $shell = New-Object -ComObject WScript.Shell
    try {
        foreach ($shortcut in $shortcuts) {
            if (!(Test-Path -LiteralPath $shortcut -PathType Leaf)) { throw "Missing Windows shortcut: $shortcut" }
            $link = $shell.CreateShortcut($shortcut)
            try {
                if ($link.TargetPath -notin $powerShellPaths -or $link.WorkingDirectory -ne $installDirectory -or
                    $link.Arguments -ne $launcherArguments) {
                    throw "The Windows shortcut has the wrong target, working directory, or launcher arguments: $shortcut"
                }
            } finally { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($link) }
        }
    } finally { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($shell) }
    Write-Output 'The EXE installed the portfolio for the current user and created both Windows shortcuts.'

    . (Join-Path $installDirectory 'launcher\Launcher.Runtime.ps1')
    $paths = Get-PortfolioLauncherPaths $installDirectory
    [void][IO.Directory]::CreateDirectory($paths.StateRoot)
    $webDirectory = Join-Path $installDirectory 'dist'
    $independent.Start()
    $occupiedPort = $independent.LocalEndpoint.Port
    [IO.File]::WriteAllText($paths.PortPath, [string]$occupiedPort)
    $server = Start-PortfolioServer $paths $webDirectory
    $url = [uri](Get-PortfolioLauncherUrl $server)
    if ($url.Scheme -ne 'http' -or $url.Host -ne '127.0.0.1' -or $url.Port -eq $occupiedPort -or
        !$server.ProbeAsync().GetAwaiter().GetResult()) {
        throw "The installed demo did not become ready on a free loopback port: $url."
    }

    $handler = [Net.Http.HttpClientHandler]::new()
    $handler.UseProxy = $false
    $client = [Net.Http.HttpClient]::new($handler)
    $client.Timeout = [TimeSpan]::FromSeconds(5)
    $html = $client.GetStringAsync($url).GetAwaiter().GetResult()
    $javascript = [regex]::Match($html, '<script\b[^>]*\bsrc="(\./assets/[^"]+\.js)"').Groups[1].Value
    $stylesheet = [regex]::Match($html, '<link\b[^>]*\bhref="(\./assets/[^"]+\.css)"').Groups[1].Value
    if (!$javascript -or !$stylesheet -or $html -notmatch 'id="root"') {
        throw 'The installed page is missing the portfolio root or its relative production assets.'
    }
    Assert-Asset $client $url $javascript 'text/javascript'
    Assert-Asset $client $url $stylesheet 'text/css'
    Assert-Asset $client $url './Srdjan_Pajic_CV.docx' 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    $apiResponse = $client.GetAsync([uri]::new($url, '/api/sections/order')).GetAwaiter().GetResult()
    try {
        if ([int]$apiResponse.StatusCode -ne 404) { throw 'The demo server should only serve installed static files.' }
    } finally { $apiResponse.Dispose() }
    Write-Output "The installed demo served HTML, JavaScript, CSS and the CV from $url with developer tools removed from PATH."

    $server.Dispose()
    $server = $null
    $releasedPort = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $url.Port)
    $releasedPort.ExclusiveAddressUse = $true
    try { $releasedPort.Start() } finally { $releasedPort.Stop() }
    $unrelatedClient = [Net.Sockets.TcpClient]::new()
    try { $unrelatedClient.Connect([Net.IPAddress]::Loopback, $occupiedPort) }
    finally { $unrelatedClient.Dispose() }
    $server = Start-PortfolioServer $paths $webDirectory
    if ([uri](Get-PortfolioLauncherUrl $server) -ne $url -or !$server.ProbeAsync().GetAwaiter().GetResult()) {
        throw 'Restart must reuse the local browser origin when its port is available.'
    }
    $server.Dispose()
    $server = $null
    Write-Output 'Stop released the demo port and left an independent listener untouched. Restart reused the local URL.'

    # An unhandled worker exception must fail the smoke test without interrupting uninstall cleanup.
    & $powerShellPaths[0] -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'WindowsStaticServerLifecycle.Tests.ps1') `
        -ServerSource (Join-Path $installDirectory 'launcher\Launcher.StaticServer.cs') -WebRoot $webDirectory
    if ($LASTEXITCODE -ne 0) { throw "The installed server failed its Start/Stop lifecycle check (exit $LASTEXITCODE)." }

    Invoke-TestInstallerStep $uninstaller "/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /LOG=`"$uninstallLog`"" $uninstallLog
    if ((Test-PortfolioRegistration) -or (Test-Path -LiteralPath $installDirectory) -or
        ($shortcuts | Where-Object { Test-Path -LiteralPath $_ }) -or
        [IO.File]::ReadAllText($sentinel) -ne 'Preserve this file.') {
        throw 'Uninstall did not clean up the installed files, shortcuts and registry entry safely.'
    }
    Write-Output 'The uninstaller removed the installed files, shortcuts and Installed Apps entry.'
    $completed = $true
} finally {
    if ($server) { $server.Dispose() }
    if ($client) { $client.Dispose() }
    $independent.Stop()
    $env:PATH = $originalPath
    if ($paths -and [IO.File]::Exists($paths.PortPath)) { [IO.File]::Delete($paths.PortPath) }
    if ($paths -and [IO.File]::Exists($paths.LogPath)) { [IO.File]::Delete($paths.LogPath) }
    if ($paths -and [IO.Directory]::Exists($paths.StateRoot)) { [IO.Directory]::Delete($paths.StateRoot) }
    if ($completed) {
        [IO.File]::Delete($installLog)
        [IO.File]::Delete($uninstallLog)
        [IO.File]::Delete($sentinel)
        [IO.Directory]::Delete($testDirectory)
    } else {
        $cleanup = Get-TestUninstaller
        if ($cleanup -and !(Test-Path -LiteralPath $uninstallLog)) {
            try { Invoke-TestInstallerStep $cleanup "/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /LOG=`"$uninstallLog`"" $uninstallLog }
            catch { Write-Warning $_.Exception.Message }
        }
        Write-Warning "Installer test files and logs are in $testDirectory."
    }
}
