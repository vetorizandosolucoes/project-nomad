#!/bin/bash
# What the "Desligar Vetorizando NOMAD" shortcut runs. Stopping the Docker daemon, not the
# containers, closes the databases cleanly and brings back on the next start what was on.
export WSL_INTEROP="${WSL_INTEROP:-$(ls -t /run/WSL/*_interop 2>/dev/null | head -1)}"

read -r -p "Desligar o sistema, a IA e o Ubuntu? (s/n) " answer
[ "$answer" = "s" ] || [ "$answer" = "S" ] || exit 0

echo "Desligando..."
cd /mnt/c/Windows || exit 1
/mnt/c/Windows/System32/schtasks.exe /Change /TN NOMAD-WSL-KeepAlive /DISABLE >/dev/null
/mnt/c/Windows/System32/schtasks.exe /End /TN NOMAD-WSL-KeepAlive >/dev/null
systemctl stop nomad-wake docker.socket docker
/mnt/c/Windows/System32/wsl.exe --terminate Ubuntu
