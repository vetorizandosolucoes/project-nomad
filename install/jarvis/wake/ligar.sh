#!/bin/bash
# What the "Vetorizando NOMAD" shortcut runs: turns everything on, waits for it, opens the window.
here="$(dirname "$(readlink -f "$0")")"
export WSL_INTEROP="${WSL_INTEROP:-$(ls -t /run/WSL/*_interop 2>/dev/null | head -1)}"

cd /mnt/c/Windows || exit 1
# "Desligar" turns these off, and opening the system again turns them back on.
/mnt/c/Windows/System32/schtasks.exe /Change /TN NOMAD-WSL-KeepAlive /ENABLE >/dev/null
/mnt/c/Windows/System32/schtasks.exe /Run /TN NOMAD-WSL-KeepAlive >/dev/null
systemctl start docker nomad-wake

for _ in $(seq 1 240); do
  curl -s -o /dev/null -m 3 http://localhost:8080/ && break
  sleep 1
done
# Detached, because the shortcut's console closes as soon as this script ends.
setsid -f "$here/abrir_janela.sh" http://localhost:8080/ >/dev/null 2>&1
