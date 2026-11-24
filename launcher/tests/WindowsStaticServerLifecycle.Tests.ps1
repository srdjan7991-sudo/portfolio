#Requires -Version 5.1
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$ServerSource,
    [Parameter(Mandatory)][string]$WebRoot
)

$ErrorActionPreference = 'Stop'
Add-Type -Path (Resolve-Path -LiteralPath $ServerSource).Path
$directory = (Resolve-Path -LiteralPath $WebRoot).Path

$port = 0
for ($cycle = 0; $cycle -lt 100; $cycle++) {
    $server = [PortfolioLauncher.StaticServer]::new($directory, $port)
    try { $port = $server.Port }
    finally { $server.Dispose() }
}

for ($cycle = 0; $cycle -lt 30; $cycle++) {
    $server = [PortfolioLauncher.StaticServer]::new($directory, 0)
    $client = [Net.Sockets.TcpClient]::new()
    try {
        $client.Connect([Net.IPAddress]::Loopback, $server.Port)
        if (!$server.ProbeAsync().GetAwaiter().GetResult()) { throw 'The server did not answer its readiness probe.' }
        $server.Dispose()
    } finally {
        $client.Dispose()
        $server.Dispose()
    }
}

Write-Output 'The installed server survived rapid Start/Stop, immediate same-port reuse and closing with local clients connected.'
