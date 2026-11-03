# Sourced by the other scripts. A system service doesn't inherit the variable that lets Linux start
# Windows programs, and the sockets of sessions that ended stay behind, so look for a live one.
if [ -z "${WSL_INTEROP:-}" ]; then
  for socket in $(ls -t /run/WSL/*_interop 2>/dev/null); do
    pid="${socket##*/}"
    if [ -d "/proc/${pid%_interop}" ]; then
      export WSL_INTEROP="$socket"
      break
    fi
  done
fi
