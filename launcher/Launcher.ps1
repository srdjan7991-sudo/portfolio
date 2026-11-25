#Requires -Version 5.1
[CmdletBinding()]
param([switch]$Installed)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[Windows.Forms.Application]::EnableVisualStyles()
[Windows.Forms.Application]::SetCompatibleTextRenderingDefault($false)

. (Join-Path $PSScriptRoot 'Launcher.Runtime.ps1')
$script:root = Split-Path $PSScriptRoot -Parent
$script:paths = Get-PortfolioLauncherPaths $script:root -Installed:$Installed
$mutex = [Threading.Mutex]::new($false, $script:paths.MutexName)
try { $acquired = $mutex.WaitOne(0) }
catch [Threading.AbandonedMutexException] { $acquired = $true }
if (!$acquired) {
    [void][Windows.Forms.MessageBox]::Show('This portfolio already has a launcher open. Use that window to start or stop the demo.', 'Windows Portfolio Launcher', 'OK', 'Information')
    $mutex.Dispose()
    return
}

$script:server = $null
$script:probe = $null
$script:previousUrl = $null
$script:usingFallbackPort = $false
$script:palettes = @{
    Light = @{ Paper = '#FCFBF8'; Surface = '#FFFEFA'; Subtle = '#F4F2ED'; Ink = '#222322'; Muted = '#555956'; Line = '#D8D5CC'; Edge = '#87847C'; Accent = '#335775'; Hover = '#27455F'; OnAccent = '#FFFFFF'; Danger = '#852C25' }
    Dark = @{ Paper = '#1C1E20'; Surface = '#2B2E31'; Subtle = '#242628'; Ink = '#F3F1ED'; Muted = '#B9BDC0'; Line = '#404447'; Edge = '#899198'; Accent = '#AAC6DF'; Hover = '#D0E3F4'; OnAccent = '#1D2A35'; Danger = '#F6C4BD' }
}
$systemLight = Get-ItemPropertyValue -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize' -Name 'AppsUseLightTheme' -ErrorAction SilentlyContinue
$script:theme = if ($null -ne $systemLight -and $systemLight -eq 0) { 'Dark' } else { 'Light' }

function Get-Color([string]$name) {
    [Drawing.ColorTranslator]::FromHtml($script:palettes[$script:theme][$name])
}

function Set-Palette([Windows.Forms.Control]$control) {
    $control.ForeColor = Get-Color 'Ink'
    switch ([string]$control.Tag) {
        'Paper' { $control.BackColor = Get-Color 'Paper' }
        'Surface' { $control.BackColor = Get-Color 'Surface' }
        'Line' { $control.BackColor = Get-Color 'Line' }
        'Muted' { $control.ForeColor = Get-Color 'Muted' }
        'Accent' { $control.ForeColor = Get-Color 'Accent' }
        'Error' { $control.ForeColor = Get-Color 'Danger' }
        'Primary' {
            $control.BackColor = Get-Color 'Accent'
            $control.ForeColor = Get-Color 'OnAccent'
            $control.FlatAppearance.BorderColor = Get-Color 'Accent'
            $control.FlatAppearance.MouseOverBackColor = Get-Color 'Hover'
            $control.FlatAppearance.MouseDownBackColor = Get-Color 'Hover'
        }
        'Secondary' {
            $control.BackColor = Get-Color 'Surface'
            $control.FlatAppearance.BorderColor = Get-Color 'Edge'
            $control.FlatAppearance.MouseOverBackColor = Get-Color 'Subtle'
            $control.FlatAppearance.MouseDownBackColor = Get-Color 'Subtle'
        }
    }
    foreach ($child in $control.Controls) { Set-Palette $child }
}

function New-Label([string]$text, [single]$size = 10, [string]$tone = '', [switch]$Strong) {
    $label = [Windows.Forms.Label]::new()
    $label.Text = $text
    $label.AutoSize = $true
    $label.Anchor = 'Left'
    $label.Margin = [Windows.Forms.Padding]::new(0, 2, 0, 2)
    $label.Font = [Drawing.Font]::new($(if ($Strong) { 'Segoe UI Semibold' } else { 'Segoe UI' }), $size)
    $label.Tag = $tone
    return $label
}

function New-Button([string]$text, [string]$tone = 'Secondary') {
    $button = [Windows.Forms.Button]::new()
    $button.Text = $text
    $button.AutoSize = $true
    $button.MinimumSize = [Drawing.Size]::new(0, 36)
    $button.Padding = [Windows.Forms.Padding]::new(11, 2, 11, 2)
    $button.Margin = [Windows.Forms.Padding]::new(0, 0, 8, 0)
    $button.FlatStyle = 'Flat'
    $button.UseVisualStyleBackColor = $false
    $button.Font = [Drawing.Font]::new('Segoe UI Semibold', 9)
    $button.Tag = $tone
    return $button
}

function New-Table([int]$columns, [string]$tone = '') {
    $table = [Windows.Forms.TableLayoutPanel]::new()
    $table.ColumnCount = $columns
    $table.Dock = 'Fill'
    $table.Margin = [Windows.Forms.Padding]::new(0)
    $table.Tag = $tone
    return $table
}

function New-Flow {
    $flow = [Windows.Forms.FlowLayoutPanel]::new()
    $flow.AutoSize = $true
    $flow.AutoSizeMode = 'GrowAndShrink'
    $flow.WrapContents = $false
    $flow.Margin = [Windows.Forms.Padding]::new(0)
    return $flow
}

function Add-AutoRows($table, [int]$count) {
    for ($index = 0; $index -lt $count; $index++) {
        [void]$table.RowStyles.Add([Windows.Forms.RowStyle]::new('AutoSize'))
    }
}

$script:form = [Windows.Forms.Form]::new()
$script:form.Text = 'Windows Portfolio Launcher'
$script:form.ClientSize = [Drawing.Size]::new(746, 300)
$script:form.MinimumSize = [Drawing.Size]::new(716, 330)
$script:form.StartPosition = 'CenterScreen'
$script:form.AutoScaleMode = 'Dpi'
$script:form.Font = [Drawing.Font]::new('Segoe UI', 9)
$script:form.AccessibleDescription = 'Start the local portfolio demo and open it in your browser.'
$script:form.Tag = 'Paper'

$frame = New-Table 1 'Paper'
$frame.Padding = [Windows.Forms.Padding]::new(24, 20, 24, 18)
$frame.RowCount = 3
Add-AutoRows $frame 1
[void]$frame.RowStyles.Add([Windows.Forms.RowStyle]::new('Percent', 100))
Add-AutoRows $frame 1
$script:form.Controls.Add($frame)

$header = New-Table 2
$header.AutoSize = $true
$header.Margin = [Windows.Forms.Padding]::new(0, 0, 0, 18)
[void]$header.ColumnStyles.Add([Windows.Forms.ColumnStyle]::new('Percent', 100))
[void]$header.ColumnStyles.Add([Windows.Forms.ColumnStyle]::new('AutoSize'))
$header.Controls.Add((New-Label 'Windows Portfolio Launcher' 24 -Strong), 0, 0)
$header.Controls.Add((New-Label 'Explore my portfolio locally' 11 'Muted'), 0, 1)
$headerActions = New-Flow
$headerActions.Anchor = 'Right, Bottom'
$logsButton = New-Button 'View logs'
$script:themeButton = New-Button $(if ($script:theme -eq 'Dark') { 'Light theme' } else { 'Dark theme' })
$script:themeButton.Margin = [Windows.Forms.Padding]::new(0)
$headerActions.Controls.AddRange(@($logsButton, $script:themeButton))
$header.Controls.Add($headerActions, 1, 0)
$header.SetRowSpan($headerActions, 2)
$frame.Controls.Add($header, 0, 0)

$border = New-Table 1 'Line'
$border.Padding = [Windows.Forms.Padding]::new(1)
$border.Margin = [Windows.Forms.Padding]::new(0, 0, 0, 16)
$panel = New-Table 1 'Surface'
$panel.Padding = [Windows.Forms.Padding]::new(18, 12, 18, 10)
Add-AutoRows $panel 3
$border.Controls.Add($panel, 0, 0)
$script:status = New-Label 'Ready to start' 18 -Strong
$script:detail = New-Label 'Start the demo to open your default browser.' 10 'Muted'
$script:detail.MaximumSize = [Drawing.Size]::new(600, 0)
$script:urlField = [Windows.Forms.TextBox]::new()
$script:urlField.Font = [Drawing.Font]::new('Consolas', 10)
$script:urlField.AccessibleName = 'Local portfolio URL'
$script:urlField.ReadOnly = $true
$script:urlField.Visible = $false
$script:urlField.Width = 305
$script:urlField.Tag = 'Surface'
$script:urlField.Margin = [Windows.Forms.Padding]::new(0, 7, 0, 0)
$panel.Controls.Add($script:status, 0, 0)
$panel.Controls.Add($script:detail, 0, 1)
$panel.Controls.Add($script:urlField, 0, 2)
$frame.Controls.Add($border, 0, 1)

$actions = New-Flow
$script:startButton = New-Button 'Start portfolio' 'Primary'
$script:openButton = New-Button 'Open Portfolio' 'Primary'
$script:restartButton = New-Button 'Restart'
$script:stopButton = New-Button 'Stop'
$exitButton = New-Button 'Exit'
$actions.Controls.AddRange(@($script:startButton, $script:openButton, $script:restartButton, $script:stopButton, $exitButton))
$frame.Controls.Add($actions, 0, 2)
$script:form.AcceptButton = $script:startButton

function Set-Status([string]$state, [string]$title, [string]$description, [string]$url = '') {
    $script:status.Text = $title
    $script:status.Tag = switch ($state) {
        'Failed' { 'Error' }
        'Ready' { 'Accent' }
        default { '' }
    }
    Set-Palette $script:status
    $script:detail.Text = $description
    $script:urlField.Text = $url
    $script:urlField.Visible = [bool]$url
    $script:startButton.Enabled = $state -in @('Stopped', 'Failed')
    $script:openButton.Enabled = $state -eq 'Ready'
    $script:restartButton.Enabled = $state -eq 'Ready'
    $script:stopButton.Enabled = $state -in @('Starting', 'Ready')
    foreach ($action in @($script:startButton, $script:openButton, $script:restartButton, $script:stopButton)) {
        $action.Visible = $action.Enabled
    }
    $script:form.AcceptButton = if ($state -eq 'Ready') { $script:openButton } else { $script:startButton }
}

function Stop-LocalPortfolio([switch]$Closing) {
    $script:probe = $null
    if ($script:server) {
        $script:server.Dispose()
        $script:server = $null
        Write-PortfolioLog $script:paths 'Info' 'Portfolio stopped'
    }
    if (!$Closing) { Set-Status 'Stopped' 'Portfolio stopped' 'Start the demo again whenever you are ready.' }
}

function Report-StartFailure([string]$message, [string]$detail) {
    Stop-LocalPortfolio
    Write-PortfolioLog $script:paths 'Error' $message $detail
    Set-Status 'Failed' 'Could not start the portfolio' $message
}

function Start-LocalPortfolio([switch]$Restart) {
    $script:previousUrl = $null
    if ($Restart -and $script:server) {
        $script:previousUrl = Get-PortfolioLauncherUrl $script:server
        Stop-LocalPortfolio
    }
    Set-Status 'Starting' 'Starting the portfolio' 'Checking the bundled portfolio on this computer.'
    Write-PortfolioLog $script:paths 'Info' 'Starting the bundled portfolio'
    try {
        $script:usingFallbackPort = $false
        $script:server = Start-PortfolioServer $script:paths (Join-Path $script:root 'dist') -FallbackUsed ([ref]$script:usingFallbackPort)
        $script:probe = $script:server.ProbeAsync()
    } catch {
        $reason = $_.Exception.GetBaseException().Message
        $message = if ($reason.StartsWith('The installed portfolio files are missing.')) { $reason }
            else { 'The local server could not start. Open View logs for details and try again.' }
        Report-StartFailure $message $reason
    }
}

function Open-LocalPortfolio {
    if (!$script:openButton.Enabled -or !$script:server) { return }
    $url = Get-PortfolioLauncherUrl $script:server
    try {
        Start-Process -FilePath $url -ErrorAction Stop
        Write-PortfolioLog $script:paths 'Info' 'Opened the default browser' $url
    } catch {
        $script:detail.Text = 'Windows could not open the browser. Copy the local address below.'
        Write-PortfolioLog $script:paths 'Warning' 'Windows could not open the default browser' $_.Exception.Message
    }
}

function Watch-LocalPortfolio {
    if (!$script:probe -or !$script:probe.IsCompleted) { return }
    $completedProbe = $script:probe
    $script:probe = $null
    if ($completedProbe.IsFaulted -or !$completedProbe.Result) {
        Report-StartFailure 'The local portfolio did not respond. Try starting it again.' 'The loopback readiness request did not return the bundled HTML.'
        return
    }
    Save-PortfolioServerPort $script:paths $script:server
    $url = Get-PortfolioLauncherUrl $script:server
    $message = if ($script:usingFallbackPort) { 'The usual port was busy. The portfolio is running at the address below.' }
        else { 'Explore the demo in your browser.' }
    Set-Status 'Ready' 'Portfolio is ready' $message $url
    Write-PortfolioLog $script:paths 'Info' 'Portfolio is ready' $url
    if ($url -ne $script:previousUrl) { Open-LocalPortfolio }
}

function Show-LauncherLogs {
    $dialog = [Windows.Forms.Form]::new()
    $dialog.Text = 'Portfolio Launcher | Logs'
    $dialog.StartPosition = 'CenterParent'
    $dialog.ClientSize = [Drawing.Size]::new(740, 390)
    $dialog.MinimumSize = [Drawing.Size]::new(650, 340)
    $dialog.Font = $script:form.Font
    $dialog.Tag = 'Paper'
    $layout = New-Table 1 'Paper'
    $layout.Padding = [Windows.Forms.Padding]::new(18)
    $layout.RowCount = 4
    Add-AutoRows $layout 1
    [void]$layout.RowStyles.Add([Windows.Forms.RowStyle]::new('Percent', 100))
    [void]$layout.RowStyles.Add([Windows.Forms.RowStyle]::new('Absolute', 68))
    Add-AutoRows $layout 1
    $dialog.Controls.Add($layout)
    $layout.Controls.Add((New-Label 'Launcher logs' 18 -Strong), 0, 0)

    $list = [Windows.Forms.ListView]::new()
    $list.AccessibleName = 'Launcher events'
    $list.View = 'Details'
    $list.FullRowSelect = $true
    $list.MultiSelect = $false
    $list.HideSelection = $false
    $list.Dock = 'Fill'
    $list.Tag = 'Surface'
    [void]$list.Columns.Add('Time', 120)
    [void]$list.Columns.Add('Level', 80)
    [void]$list.Columns.Add('Event', 470)
    $layout.Controls.Add($list, 0, 1)

    $detail = [Windows.Forms.TextBox]::new()
    $detail.AccessibleName = 'Selected event details'
    $detail.ReadOnly = $true
    $detail.Multiline = $true
    $detail.Dock = 'Fill'
    $detail.Tag = 'Surface'
    $layout.Controls.Add($detail, 0, 2)
    $buttons = New-Flow
    $buttons.Margin = [Windows.Forms.Padding]::new(0, 7, 0, 0)
    $refresh = New-Button 'Refresh'
    $copy = New-Button 'Copy selected event'
    $copy.Enabled = $false
    $close = New-Button 'Close'
    $close.DialogResult = 'Cancel'
    $dialog.CancelButton = $close
    $buttons.Controls.AddRange(@($refresh, $copy, $close))
    $layout.Controls.Add($buttons, 0, 3)

    $readLog = ${function:Read-PortfolioLauncherLog}
    $logPath = $script:paths.LogPath
    $load = {
        $list.BeginUpdate()
        try {
            $list.Items.Clear()
            foreach ($entry in @(& $readLog $logPath)) {
                if (!$entry.Message) { continue }
                $timestamp = [DateTimeOffset]::MinValue
                $time = if ([DateTimeOffset]::TryParse($entry.Timestamp, [ref]$timestamp)) { $timestamp.LocalDateTime.ToString('MM-dd HH:mm:ss') } else { '' }
                $item = [Windows.Forms.ListViewItem]::new([string[]]@($time, $entry.Level, $entry.Message))
                $item.Tag = [string]$entry.Detail
                [void]$list.Items.Add($item)
            }
        } finally { $list.EndUpdate() }
        if ($list.Items.Count -gt 0) {
            $last = $list.Items.Count - 1
            $list.Items[$last].Selected = $true
            $list.EnsureVisible($last)
        } else { $detail.Text = 'No launcher events yet. Start the portfolio and open this window again.' }
    }.GetNewClosure()
    $list.Add_SelectedIndexChanged({
        $copy.Enabled = $list.SelectedItems.Count -gt 0
        $detail.Text = if ($copy.Enabled) { [string]$list.SelectedItems[0].Tag } else { '' }
    }.GetNewClosure())
    $copy.Add_Click({
        if (!$list.SelectedItems.Count) { return }
        $item = $list.SelectedItems[0]
        $summary = ($item.SubItems | ForEach-Object { $_.Text }) -join ' | '
        if ($item.Tag) { $summary += "`r`n" + $item.Tag }
        try { [Windows.Forms.Clipboard]::SetText($summary) }
        catch { [void][Windows.Forms.MessageBox]::Show($dialog, 'The clipboard is busy. Try again.', 'Portfolio Launcher') }
    }.GetNewClosure())
    $refresh.Add_Click($load)
    $dialog.Add_Shown($load)
    Set-Palette $dialog
    try { [void]$dialog.ShowDialog($script:form) }
    finally { $dialog.Dispose() }
}

$script:startButton.Add_Click({ Start-LocalPortfolio })
$script:openButton.Add_Click({ Open-LocalPortfolio })
$script:restartButton.Add_Click({ Start-LocalPortfolio -Restart })
$script:stopButton.Add_Click({ Stop-LocalPortfolio })
$exitButton.Add_Click({ $script:form.Close() })
$logsButton.Add_Click({ Show-LauncherLogs })
$script:themeButton.Add_Click({
    $script:theme = if ($script:theme -eq 'Light') { 'Dark' } else { 'Light' }
    $script:themeButton.Text = if ($script:theme -eq 'Dark') { 'Light theme' } else { 'Dark theme' }
    Set-Palette $script:form
})

$timer = [Windows.Forms.Timer]::new()
$timer.Interval = 150
$timer.Add_Tick({ Watch-LocalPortfolio })
try {
    [void][IO.Directory]::CreateDirectory($script:paths.StateRoot)
    Set-Palette $script:form
    Set-Status 'Stopped' 'Ready to start' 'Start the demo to open your default browser.'
    $script:form.Add_Shown({ $timer.Start() })
    [Windows.Forms.Application]::Run($script:form)
} finally {
    $timer.Dispose()
    Stop-LocalPortfolio -Closing
    $script:form.Dispose()
    $mutex.ReleaseMutex()
    $mutex.Dispose()
}
