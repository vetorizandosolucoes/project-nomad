#!/bin/bash
# Opens a page in the installed app or, before it is installed, in a plain Edge window. Its own
# profile, because the flag that lets Jarvis speak before anyone clicks on the page only applies
# when Edge starts a browser of its own.
url="${1:-http://localhost:8080/}"

# A system service doesn't inherit the variable that lets Linux start Windows programs.
export WSL_INTEROP="${WSL_INTEROP:-$(ls -t /run/WSL/*_interop 2>/dev/null | head -1)}"

cd /mnt/c/Windows || exit 1
local_app_data="$(/mnt/c/Windows/System32/cmd.exe /c 'echo %LOCALAPPDATA%' | tr -d '\r')"
profile="$local_app_data\\Vetorizando NOMAD\\janela"

# This profile exists only for the system, so the one app installed in it is ours.
app_id="$(ls "$(wslpath "$profile")/Default/Web Applications/Manifest Resources" 2>/dev/null | head -1)"
if [ -n "$app_id" ]; then
  target=("--app-id=$app_id" "--app-launch-url-for-shortcuts-menu-item=$url")
else
  target=("--app=$url")
fi

exec "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
  "${target[@]}" \
  "--user-data-dir=$profile" \
  --autoplay-policy=no-user-gesture-required \
  --no-first-run \
  --disable-session-crashed-bubble
