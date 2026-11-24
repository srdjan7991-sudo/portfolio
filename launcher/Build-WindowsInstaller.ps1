#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$CompilerPath,
    [string]$Version,
    [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
if (!$Version) { $Version = (Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw | ConvertFrom-Json).version }
if ($Version -notmatch '\A\d{1,5}\.\d{1,5}\.\d{1,5}\z' -or
    ($Version.Split('.') | Where-Object { [int]$_ -gt 65535 })) {
    throw 'Version must be a numeric major.minor.patch value with components at most 65535.'
}

if (!$CompilerPath) {
    $compiler = Get-Command ISCC.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($compiler) {
        $CompilerPath = $compiler.Source
    } else {
        $compiler = @([Environment]::GetFolderPath('ProgramFilesX86'), [Environment]::GetFolderPath('ProgramFiles')) |
            Where-Object { $_ } |
            ForEach-Object { Join-Path $_ 'Inno Setup 6\ISCC.exe' } |
            Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } |
            Select-Object -First 1
        $CompilerPath = $compiler
    }
}
if (!$CompilerPath -or !(Test-Path -LiteralPath $CompilerPath -PathType Leaf)) {
    throw 'Inno Setup 6 ISCC.exe was not found. Pass -CompilerPath with the path to the compiler.'
}
$compiler = (Resolve-Path -LiteralPath $CompilerPath).Path
$node = (Get-Command node.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$npm = (Get-Command npm.cmd -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$vite = Join-Path $root 'node_modules\vite\bin\vite.js'
if (!(Test-Path -LiteralPath $vite -PathType Leaf)) { throw 'Run npm ci in the repository before building the installer.' }

if (!$OutputDirectory) { $OutputDirectory = Join-Path $root 'artifacts' }
$outputFolder = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputDirectory)
[void][IO.Directory]::CreateDirectory($outputFolder)
$outputFile = Join-Path $outputFolder 'Portfolio-Setup.exe'
$workspace = Join-Path $outputFolder ('.portfolio-setup-' + [Guid]::NewGuid().ToString('N'))
$workspace = [IO.Path]::GetFullPath($workspace)
if ([IO.Path]::GetFullPath((Split-Path $workspace -Parent)) -ne [IO.Path]::GetFullPath($outputFolder).TrimEnd('\')) {
    throw 'Invalid installer staging directory.'
}
$packageRoot = Join-Path $workspace 'package'
$webRoot = Join-Path $packageRoot 'dist'
$launcherRoot = Join-Path $packageRoot 'launcher'
[void][IO.Directory]::CreateDirectory($launcherRoot)

Push-Location -LiteralPath $root
try {
    & $npm run typecheck
    if ($LASTEXITCODE -ne 0) { throw "TypeScript failed with exit code $LASTEXITCODE." }
    & $node $vite build --mode windows-demo --outDir $webRoot
    if ($LASTEXITCODE -ne 0) { throw "Vite failed with exit code $LASTEXITCODE." }
    if (!(Test-Path -LiteralPath (Join-Path $webRoot 'index.html') -PathType Leaf)) {
        throw 'The demo build did not produce index.html.'
    }
    [IO.File]::WriteAllText((Join-Path $webRoot '.portfolio-windows-demo'), 'portfolio-windows-demo-v1')

    foreach ($name in @('Launcher.ps1', 'Launcher.Runtime.ps1', 'Launcher.StaticServer.cs')) {
        [IO.File]::Copy((Join-Path $PSScriptRoot $name), (Join-Path $launcherRoot $name))
    }

    & $compiler '/Qp' "/DAppVersion=$Version" "/DPayloadDir=$packageRoot" "/O$workspace" (Join-Path $PSScriptRoot 'Portfolio.iss')
    if ($LASTEXITCODE -ne 0) { throw "Inno Setup failed with exit code $LASTEXITCODE." }
    $installer = Join-Path $workspace 'Portfolio-Setup.exe'
    if (![IO.File]::Exists($installer)) { throw 'Inno Setup did not produce Portfolio-Setup.exe.' }

    if ([IO.File]::Exists($outputFile)) {
        [IO.File]::Replace($installer, $outputFile, (Join-Path $workspace 'previous.exe'))
    } else {
        [IO.File]::Move($installer, $outputFile)
    }
    Write-Output "Windows installer: $outputFile"
} finally {
    Pop-Location
    if ([IO.Directory]::Exists($workspace)) { [IO.Directory]::Delete($workspace, $true) }
}
