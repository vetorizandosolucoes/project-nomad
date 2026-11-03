#!/bin/bash
# Installs the "Jarvis" listener as a service inside Ubuntu, and the Windows shortcuts.
set -euo pipefail

here="$(dirname "$(readlink -f "$0")")"
target=/opt/project-nomad/wake
model_zip=vosk-model-small-pt-0.3.zip
model_sha256=6e1ce909032e1afa7a88e68a3d628ecafff302bdf195befab308826c395e93b7

apt-get install -y -qq pulseaudio-utils python3-venv unzip >/dev/null
mkdir -p "$target"
cp "$here/listener.py" "$here/abrir_janela.sh" "$here/ligar.sh" "$here/desligar.sh" "$target/"
chmod +x "$target"/*.sh "$target/listener.py"

[ -x "$target/venv/bin/python" ] || python3 -m venv "$target/venv"
"$target/venv/bin/pip" install -q vosk==0.3.45

if [ ! -f "$target/model/final.mdl" ]; then
  temp="$(mktemp -d)"
  curl -fsSL -o "$temp/$model_zip" "https://alphacephei.com/vosk/models/$model_zip"
  echo "$model_sha256  $temp/$model_zip" | sha256sum -c --quiet
  unzip -q "$temp/$model_zip" -d "$temp"
  rm -rf "$target/model"
  mv "$temp/vosk-model-small-pt-0.3" "$target/model"
  rm -rf "$temp"
fi

cp "$here/nomad-wake.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now nomad-wake

export WSL_INTEROP="${WSL_INTEROP:-$(ls -t /run/WSL/*_interop 2>/dev/null | head -1)}"
cd /mnt/c/Windows
/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -NoProfile -Command '
$wsl = Join-Path $env:WINDIR "System32\wsl.exe"
$shell = New-Object -ComObject WScript.Shell
foreach ($folder in [Environment]::GetFolderPath("Desktop"), [Environment]::GetFolderPath("Programs")) {
  # "Vetorizando NOMAD" is the name of the installed app, whose shortcut Edge creates.
  $on = $shell.CreateShortcut((Join-Path $folder "Ligar Vetorizando NOMAD.lnk"))
  $on.TargetPath = $wsl
  $on.Arguments = "-d Ubuntu -u root -- /opt/project-nomad/wake/ligar.sh"
  $on.WindowStyle = 7
  $on.IconLocation = Join-Path $env:LOCALAPPDATA "Vetorizando NOMAD\icone.ico"
  $on.Description = "Liga o sistema e abre a janela"
  $on.Save()
  $off = $shell.CreateShortcut((Join-Path $folder "Desligar Vetorizando NOMAD.lnk"))
  $off.TargetPath = $wsl
  $off.Arguments = "-d Ubuntu -u root -- /opt/project-nomad/wake/desligar.sh"
  $off.IconLocation = Join-Path $env:LOCALAPPDATA "Vetorizando NOMAD\icone.ico"
  $off.Description = "Desliga o sistema e o Ubuntu para poupar bateria"
  $off.Save()
}'
echo "Escuta instalada."
