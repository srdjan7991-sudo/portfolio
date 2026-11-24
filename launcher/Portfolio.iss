#ifndef AppVersion
  #error AppVersion must be set by Build-WindowsInstaller.ps1
#endif
#ifndef PayloadDir
  #error PayloadDir must be set by Build-WindowsInstaller.ps1
#endif

#define AppName "Srdjan Pajic Portfolio"
#define LauncherName "Portfolio Launcher"
#define PowerShell "{sys}\WindowsPowerShell\v1.0\powershell.exe"
#define LauncherArguments '-NoLogo -NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\launcher\Launcher.ps1"" -Installed'

[Setup]
AppId={{0EB81974-1C48-4C8B-91C0-F39DAADED150}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=Srdjan Pajic
AppPublisherURL=https://srdjan7991-sudo.github.io/portfolio/
AppSupportURL=https://github.com/srdjan7991-sudo/portfolio
AppUpdatesURL=https://github.com/srdjan7991-sudo/portfolio/releases/latest
DefaultDirName={localappdata}\Programs\{#AppName}
DefaultGroupName={#LauncherName}
DisableDirPage=yes
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
MinVersion=10.0
UninstallDisplayName={#AppName}
; The installed launcher holds this mutex while its window is open.
AppMutex=Local\SrdjanPajicPortfolioInstalled-v1
CloseApplications=no
RestartApplications=no
WizardStyle=modern
Compression=lzma2
SolidCompression=yes
OutputBaseFilename=Portfolio-Setup
VersionInfoVersion={#AppVersion}
VersionInfoDescription={#AppName} Setup
VersionInfoProductName={#AppName}

[Files]
Source: "{#PayloadDir}\dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#PayloadDir}\launcher\*"; DestDir: "{app}\launcher"; Flags: ignoreversion

[Icons]
Name: "{userdesktop}\{#LauncherName}"; Filename: "{#PowerShell}"; Parameters: "{#LauncherArguments}"; WorkingDir: "{app}"; Comment: "Explore Srdjan Pajic's portfolio locally"
Name: "{userprograms}\{#LauncherName}"; Filename: "{#PowerShell}"; Parameters: "{#LauncherArguments}"; WorkingDir: "{app}"; Comment: "Explore Srdjan Pajic's portfolio locally"

[Run]
Filename: "{#PowerShell}"; Parameters: "{#LauncherArguments}"; WorkingDir: "{app}"; Description: "Open {#LauncherName}"; Flags: postinstall nowait skipifsilent unchecked
