# The Windows side of Jarvis: the icon by the clock and the floating animation with its captions.
# It runs built-in Windows components only, takes orders from standard input ("state listening",
# "heard ...", "answer ...", "show", "hide", "exit") and reports clicks on standard output.
$ProgressPreference = 'SilentlyContinue'
Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase, System.Windows.Forms, System.Drawing
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

[xml]$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        WindowStyle="None" AllowsTransparency="True" Background="Transparent" Topmost="True"
        ShowInTaskbar="False" ShowActivated="False" ResizeMode="NoResize" Width="520" SizeToContent="Height">
  <StackPanel HorizontalAlignment="Right">
    <Border x:Name="Captions" CornerRadius="14" Padding="16,12" Margin="0,0,0,10" Background="#D9000000" Visibility="Collapsed">
      <StackPanel>
        <TextBlock x:Name="Heard" Foreground="#9FE6FF" FontFamily="Segoe UI" FontSize="17" TextWrapping="Wrap" Visibility="Collapsed"/>
        <TextBlock x:Name="Answer" Foreground="White" FontFamily="Segoe UI Semibold" FontSize="20" TextWrapping="Wrap"
                   LineHeight="27" Margin="0,4,0,0" Visibility="Collapsed"/>
      </StackPanel>
    </Border>
    <Grid x:Name="Reactor" Width="96" Height="96" HorizontalAlignment="Right" Background="#01000000" RenderTransformOrigin="0.5,0.5" Cursor="Hand">
      <Ellipse x:Name="Halo" Width="96" Height="96" Opacity="0.35"/>
      <Ellipse x:Name="Outer" Width="90" Height="90" StrokeThickness="2" StrokeDashArray="14 7" RenderTransformOrigin="0.5,0.5"/>
      <Ellipse x:Name="Middle" Width="68" Height="68" StrokeThickness="5" StrokeDashArray="3 2" RenderTransformOrigin="0.5,0.5"/>
      <Ellipse x:Name="Core" Width="34" Height="34"/>
    </Grid>
  </StackPanel>
</Window>
'@

$window = [System.Windows.Markup.XamlReader]::Load((New-Object System.Xml.XmlNodeReader $xaml))
foreach ($name in 'Captions', 'Heard', 'Answer', 'Reactor', 'Halo', 'Outer', 'Middle', 'Core') {
  Set-Variable -Name $name -Value $window.FindName($name) -Scope Script
}
$outerSpin = New-Object System.Windows.Media.RotateTransform
$middleSpin = New-Object System.Windows.Media.RotateTransform
$pulse = New-Object System.Windows.Media.ScaleTransform 1, 1
$Outer.RenderTransform = $outerSpin
$Middle.RenderTransform = $middleSpin
$Reactor.RenderTransform = $pulse

$looks = @{
  listening = @{ Color = '#2FC6FF'; Speed = 1.5 }
  thinking  = @{ Color = '#FFB648'; Speed = 8 }
  speaking  = @{ Color = '#7FE9FF'; Speed = 3 }
}
$script:speed = 1.5
$script:state = 'listening'
$script:level = 0.0
$script:shown = 0.0

function Set-Look($name) {
  $look = $looks[$name]
  if (-not $look) { return }
  $color = [System.Windows.Media.ColorConverter]::ConvertFromString($look.Color)
  $brush = New-Object System.Windows.Media.SolidColorBrush $color
  $Outer.Stroke = $brush
  $Middle.Stroke = $brush
  $clear = [System.Windows.Media.Color]::FromArgb(0, $color.R, $color.G, $color.B)
  $Core.Fill = New-Object System.Windows.Media.RadialGradientBrush ([System.Windows.Media.Colors]::White), $color
  $Halo.Fill = New-Object System.Windows.Media.RadialGradientBrush $color, $clear
  $script:speed = $look.Speed
  $script:state = $name
}

function Set-Caption($block, $text) {
  $block.Text = $text
  $block.Visibility = if ($text) { 'Visible' } else { 'Collapsed' }
  $Captions.Visibility = if ($Heard.Text -or $Answer.Text) { 'Visible' } else { 'Collapsed' }
}

function Move-ToCorner {
  $area = [System.Windows.SystemParameters]::WorkArea
  $window.Left = $area.Right - $window.ActualWidth - 24
  $window.Top = $area.Bottom - $window.ActualHeight - 24
}

function Report($message) {
  [Console]::Out.WriteLine($message)
  [Console]::Out.Flush()
}

$window.Add_SizeChanged({ Move-ToCorner })
$Reactor.Add_MouseLeftButtonDown({ Report 'dismiss' })
Set-Look 'listening'

# The icon by the clock.
$tray = New-Object System.Windows.Forms.NotifyIcon
$iconFile = Join-Path $env:LOCALAPPDATA 'Vetorizando NOMAD\icone.ico'
$tray.Icon = if (Test-Path $iconFile) { New-Object System.Drawing.Icon $iconFile } else { [System.Drawing.SystemIcons]::Application }
$tray.Text = 'Jarvis'
$menu = New-Object System.Windows.Forms.ContextMenuStrip

function Add-MenuItem($label, $message, [bool]$check) {
  $item = New-Object System.Windows.Forms.ToolStripMenuItem $label
  $item.Tag = $message
  $item.Add_Click({ param($sender) Report $sender.Tag })
  [void]$menu.Items.Add($item)
  return $item
}

[void](Add-MenuItem 'Abrir Vetorizando NOMAD' 'open' $false)
[void](Add-MenuItem 'Falar com o Jarvis' 'talk' $false)
[void]$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))
$listenItem = Add-MenuItem 'Atender quando eu disser "Jarvis"' 'toggle-listen' $true
$heardItem = Add-MenuItem 'Mostrar o que eu falo' 'toggle-heard' $true
$answerItem = Add-MenuItem 'Mostrar a resposta' 'toggle-answer' $true
[void]$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))
$quitItem = New-Object System.Windows.Forms.ToolStripMenuItem 'Finalizar (desliga o Jarvis e o sistema)'
$quitItem.Add_Click({
  $answer = [System.Windows.MessageBox]::Show(
    'Desligar o Jarvis, a IA e o Ubuntu? Para voltar, use o atalho "Ligar Vetorizando NOMAD".',
    'Jarvis', 'OKCancel', 'Question')
  if ($answer -eq 'OK') { Report 'quit' }
})
[void]$menu.Items.Add($quitItem)
$tray.ContextMenuStrip = $menu
$tray.Add_MouseDoubleClick({ Report 'open' })
$tray.Visible = $true

function Stop-All {
  $timer.Stop()
  $tray.Visible = $false
  $tray.Dispose()
  $window.Close()
  [System.Windows.Threading.Dispatcher]::CurrentDispatcher.InvokeShutdown()
}

# On a busy machine the service may give up on a slow start and launch another copy. The newest one
# stays, so there's never a second icon by the clock.
$ownerFile = Join-Path $env:TEMP 'vetorizando-jarvis.pid'
Set-Content -Path $ownerFile -Value $PID

# Not [Console]::In: its "async" read blocks, and would freeze the animation between commands.
$reader = New-Object System.IO.StreamReader ([Console]::OpenStandardInput()), ([System.Text.Encoding]::UTF8)
$script:pending = $reader.ReadLineAsync()
$script:tick = 0
$script:beat = 1
$timer = New-Object System.Windows.Threading.DispatcherTimer
# Fast only while the animation is on screen: the rest of the time it just waits for orders.
$activeInterval = [TimeSpan]::FromMilliseconds(33)
$idleInterval = [TimeSpan]::FromMilliseconds(250)
$timer.Interval = $idleInterval
$timer.Add_Tick({
  if (($script:beat++ % 60) -eq 0 -and (Get-Content -Path $ownerFile -ErrorAction SilentlyContinue) -ne "$PID") {
    Stop-All
    return
  }
  if ($window.IsVisible) {
    $script:tick += 1
    $outerSpin.Angle = ($outerSpin.Angle + $script:speed) % 360
    $middleSpin.Angle = ($middleSpin.Angle - $script:speed * 1.6) % 360
    $target = $script:level
    if ($script:state -eq 'speaking') { $target = 0.45 + 0.4 * [Math]::Abs([Math]::Sin($script:tick / 3.1) * [Math]::Sin($script:tick / 7.3)) }
    elseif ($script:state -eq 'thinking') { $target = 0.2 + 0.12 * [Math]::Sin($script:tick / 5) }
    $script:shown += ($target - $script:shown) * 0.3
    $scale = 1 + 0.22 * $script:shown
    $pulse.ScaleX = $scale
    $pulse.ScaleY = $scale
    $Halo.Opacity = 0.25 + 0.6 * $script:shown
  }
  while ($script:pending.IsCompleted) {
    $line = $script:pending.Result
    if ($null -eq $line -or $line -eq 'exit') {
      Stop-All
      return
    }
    $space = $line.IndexOf(' ')
    $command = if ($space -lt 0) { $line } else { $line.Substring(0, $space) }
    $value = if ($space -lt 0) { '' } else { $line.Substring($space + 1) }
    switch ($command) {
      'show' { $timer.Interval = $activeInterval; $window.Show() }
      'hide' {
        $window.Hide()
        Set-Caption $Heard ''
        Set-Caption $Answer ''
        $timer.Interval = $idleInterval
        [GC]::Collect()
      }
      'state' { Set-Look $value }
      'level' { $script:level = [double]::Parse($value, [Globalization.CultureInfo]::InvariantCulture) }
      'heard' { Set-Caption $Heard $value }
      'answer' { Set-Caption $Answer $value }
      'tip' { $tray.Text = $value }
      'menu' {
        $flags = $value.Split(' ')
        $listenItem.Checked = $flags[0] -eq '1'
        $heardItem.Checked = $flags[1] -eq '1'
        $answerItem.Checked = $flags[2] -eq '1'
      }
    }
    $script:pending = $reader.ReadLineAsync()
  }
})
$timer.Start()
Report 'ready'
[GC]::Collect()
[System.Windows.Threading.Dispatcher]::Run()
