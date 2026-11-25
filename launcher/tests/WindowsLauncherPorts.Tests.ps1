#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$LauncherDirectory,
    [string]$ScratchParent = [IO.Path]::GetTempPath()
)

$ErrorActionPreference = 'Stop'
if (!$LauncherDirectory) { $LauncherDirectory = Split-Path -Parent $PSScriptRoot }
. (Join-Path $LauncherDirectory 'Launcher.Runtime.ps1')

# Use the actual launcher lifecycle in this test. Only the UI effects are replaced.
$functions = @('Start-LocalPortfolio', 'Watch-LocalPortfolio', 'Report-StartFailure', 'Stop-LocalPortfolio')
$parser = [Management.Automation.Language.Parser]
$tokens = $errors = $null
$launcher = (Resolve-Path -LiteralPath (Join-Path $LauncherDirectory 'Launcher.ps1')).Path
$ast = $parser::ParseFile($launcher, [ref]$tokens, [ref]$errors)
$lifecycle = @($ast.EndBlock.Statements | Where-Object {
    $_ -is [Management.Automation.Language.FunctionDefinitionAst] -and $_.Name -in $functions
})
if ($errors.Count -or $lifecycle.Count -ne $functions.Count) { throw 'Could not load the launcher lifecycle.' }
foreach ($definition in $lifecycle) { . ([scriptblock]::Create($definition.Extent.Text)) }

function Set-Status($state) { $script:status = $state }
function Open-LocalPortfolio { $script:openedUrls.Add((Get-PortfolioLauncherUrl $script:server)) }

function Wait-ForReadiness {
    if (!$script:probe -or !$script:probe.Wait(10000)) { throw 'The readiness probe did not complete.' }
    Watch-LocalPortfolio
}

function New-TestListener([int]$port) {
    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $port)
    $listener.ExclusiveAddressUse = $true
    return $listener
}

function Test-FreePort([int]$port) {
    $listener = New-TestListener $port
    try {
        $listener.Start()
        return $true
    } catch [Net.Sockets.SocketException] {
        if ($_.Exception.SocketErrorCode -notin @('AddressAlreadyInUse', 'AccessDenied')) { throw }
        return $false
    } finally { $listener.Stop() }
}

$script:root = Join-Path (Resolve-Path -LiteralPath $ScratchParent).Path ('portfolio-ports-' + [Guid]::NewGuid().ToString('N'))
$webDirectory = Join-Path $script:root 'dist'
$script:paths = @{
    LogPath = Join-Path $script:root 'launcher.ndjson'
    PortPath = Join-Path $script:root 'port.txt'
}
$index = Join-Path $webDirectory 'index.html'
$marker = Join-Path $webDirectory '.portfolio-windows-demo'
$script:server = $script:probe = $null
$script:openedUrls = [Collections.Generic.List[string]]::new()
$defaultPort = 4378
$independent = New-TestListener $defaultPort
$independentStarted = $false
$defaultAvailable = Test-FreePort $defaultPort

try {
    [void][IO.Directory]::CreateDirectory($webDirectory)
    [IO.File]::WriteAllText($marker, 'portfolio-windows-demo-v1')
    [IO.File]::WriteAllText($index, '<!doctype html><title>Port regression test</title>')

    [IO.File]::WriteAllText($script:paths.PortPath, '12345')
    $locked = [IO.File]::Open($script:paths.PortPath, 'Open', 'ReadWrite', 'None')
    try {
        Start-LocalPortfolio
        Wait-ForReadiness
        if ($script:status -ne 'Ready' -or ($defaultAvailable -and $script:server.Port -ne $defaultPort)) {
            throw 'An unreadable port cache must allow startup with default port selection.'
        }
        $warnings = @(Read-PortfolioLauncherLog $script:paths.LogPath | Where-Object { $_.Level -eq 'Warning' })
        if (!($warnings | Where-Object { $_.Message -like 'Could not read the saved port.*' -and $_.Detail })) {
            throw 'The launcher must log why it could not read the saved port.'
        }
    } finally { $locked.Dispose() }
    Stop-LocalPortfolio
    if ([IO.File]::ReadAllText($script:paths.PortPath) -ne '12345') { throw 'The locked cache was changed.' }
    Write-Output 'A locked port cache logs the read failure and leaves the local server usable.'

    foreach ($invalid in @('invalid', '1023', '65536')) {
        [IO.File]::WriteAllText($script:paths.PortPath, $invalid)
        Start-LocalPortfolio
        if ($script:status -ne 'Starting' -or ($defaultAvailable -and $script:server.Port -ne $defaultPort) -or
            [IO.File]::ReadAllText($script:paths.PortPath) -ne $invalid) {
            throw 'Invalid saved ports must use default port selection without writing before readiness.'
        }
        Wait-ForReadiness
        if ($script:status -ne 'Ready' -or [IO.File]::ReadAllText($script:paths.PortPath) -ne [string]$script:server.Port) {
            throw 'A successful readiness check must replace the invalid saved port.'
        }
        Stop-LocalPortfolio
    }
    Write-Output 'Invalid saved ports are ignored and replaced only after readiness.'

    if ($defaultAvailable) {
        $independent.Start()
        $independentStarted = $true
    }
    [IO.File]::Delete($script:paths.PortPath)
    Start-LocalPortfolio
    if ($script:status -ne 'Starting' -or !$script:usingFallbackPort -or $script:server.Port -eq $defaultPort -or
        [IO.File]::Exists($script:paths.PortPath)) { throw 'A busy default port must bind a fallback without saving it yet.' }
    Wait-ForReadiness
    $fallbackPort = $script:server.Port
    if ($script:status -ne 'Ready' -or [IO.File]::ReadAllText($script:paths.PortPath) -ne [string]$fallbackPort) {
        throw 'The ready fallback port was not saved.'
    }

    $previousOpenCount = $script:openedUrls.Count
    Start-LocalPortfolio -Restart
    Wait-ForReadiness
    if ($script:status -ne 'Ready' -or $script:server.Port -ne $fallbackPort -or $script:openedUrls.Count -ne $previousOpenCount) {
        throw 'Restart must reuse the ready port without launching a second browser tab.'
    }
    Stop-LocalPortfolio
    if ($script:status -ne 'Stopped' -or !(Test-FreePort $fallbackPort)) { throw 'Stop did not release the portfolio port.' }
    if ($independentStarted -and (Test-FreePort $defaultPort)) { throw 'Stop released an unrelated listener.' }
    Write-Output 'A busy default port uses a ready fallback, Restart reuses it, and Stop releases it.'

    # A bound server returns empty HTML. The real HTTP probe must reject it.
    [IO.File]::WriteAllText($index, '')
    [IO.File]::WriteAllText($script:paths.PortPath, [string]$defaultPort)
    Start-LocalPortfolio
    if ($script:status -ne 'Starting' -or !$script:usingFallbackPort) { throw 'Expected a bound fallback before the failed readiness check.' }
    $failedPort = $script:server.Port
    if ([IO.File]::ReadAllText($script:paths.PortPath) -ne [string]$defaultPort) { throw 'The saved port changed before readiness.' }
    Wait-ForReadiness
    if ($script:status -ne 'Failed' -or $script:server -or $script:probe -or
        [IO.File]::ReadAllText($script:paths.PortPath) -ne [string]$defaultPort -or
        $script:openedUrls.Count -ne $previousOpenCount -or !(Test-FreePort $failedPort)) {
        throw 'Failed readiness must close the server, retain the previous port, and leave the browser closed.'
    }
    Write-Output "Failed HTTP readiness preserved the previous port and released the fallback (PowerShell $($PSVersionTable.PSVersion))."
} finally {
    Stop-LocalPortfolio -Closing
    $independent.Stop()
    foreach ($file in @($script:paths.PortPath, $script:paths.LogPath, $index, $marker)) { [IO.File]::Delete($file) }
    if ([IO.Directory]::Exists($webDirectory)) { [IO.Directory]::Delete($webDirectory) }
    if ([IO.Directory]::Exists($script:root)) { [IO.Directory]::Delete($script:root) }
}
