# Compiles the Windows launcher and creates its Desktop and Start menu shortcuts.
# Needs nothing beyond Windows: the C# compiler ships with the .NET Framework.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$name = 'Vetorizando NOMAD'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = Join-Path $env:LOCALAPPDATA $name
$exe = Join-Path $target "$name.exe"
$iconPath = Join-Path $target 'icone.ico'
$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
New-Item -ItemType Directory -Force $target | Out-Null

# Builds the .ico from the logo, centered on a transparent square at each size.
$source = [System.Drawing.Image]::FromFile((Join-Path $here '..\..\admin\public\vetorizando-icon.png'))
$sizes = 16, 24, 32, 48, 256
$images = foreach ($size in $sizes) {
  $bitmap = New-Object System.Drawing.Bitmap $size, $size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.InterpolationMode = 'HighQualityBicubic'
  $scale = [Math]::Min($size / $source.Width, $size / $source.Height)
  $width = [int]($source.Width * $scale); $height = [int]($source.Height * $scale)
  $graphics.DrawImage($source, [int](($size - $width) / 2), [int](($size - $height) / 2), $width, $height)
  $graphics.Dispose()
  $memory = New-Object System.IO.MemoryStream
  $bitmap.Save($memory, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
  , $memory.ToArray()
}
$source.Dispose()

$file = [System.IO.File]::Create($iconPath)
$writer = New-Object System.IO.BinaryWriter $file
$writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $side = if ($sizes[$i] -ge 256) { 0 } else { $sizes[$i] }
  $writer.Write([byte]$side); $writer.Write([byte]$side); $writer.Write([byte]0); $writer.Write([byte]0)
  $writer.Write([uint16]1); $writer.Write([uint16]32)
  $writer.Write([uint32]$images[$i].Length); $writer.Write([uint32]$offset)
  $offset += $images[$i].Length
}
foreach ($image in $images) { $writer.Write([byte[]]$image) }
$writer.Close()

& $csc /nologo /target:winexe /platform:x64 /codepage:65001 /optimize+ "/win32icon:$iconPath" "/out:$exe" `
  /reference:System.Windows.Forms.dll /reference:System.Drawing.dll (Join-Path $here 'VetorizandoNomad.cs')
if ($LASTEXITCODE -ne 0) { throw 'A compilacao falhou.' }

$shell = New-Object -ComObject WScript.Shell
$folders = [Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs')
foreach ($folder in $folders) {
  $shortcut = $shell.CreateShortcut((Join-Path $folder "$name.lnk"))
  $shortcut.TargetPath = $exe
  $shortcut.WorkingDirectory = $target
  $shortcut.Description = 'Liga o sistema e abre a janela'
  $shortcut.Save()
}
Write-Output $exe
