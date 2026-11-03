#!/bin/bash
# What the "Desligar Vetorizando NOMAD" shortcut runs. Stopping the Docker daemon, not the
# containers, closes the databases cleanly and brings back on the next start what was on.
. "$(dirname "$(readlink -f "$0")")/interop.sh"

# The icon by the clock has already asked.
if [ "$1" != "--confirmado" ]; then
  read -r -p "Desligar o sistema, a IA e o Ubuntu? (s/n) " answer
  [ "$answer" = "s" ] || [ "$answer" = "S" ] || exit 0
fi

echo "Desligando..."
cd /mnt/c/Windows || exit 1
/mnt/c/Windows/System32/schtasks.exe /Change /TN NOMAD-WSL-KeepAlive /DISABLE >/dev/null
/mnt/c/Windows/System32/schtasks.exe /End /TN NOMAD-WSL-KeepAlive >/dev/null
systemctl stop nomad-wake docker.socket docker
/mnt/c/Windows/System32/wsl.exe --terminate Ubuntu
