#!/bin/bash
# Installs the Jarvis service (OpenJarvis) next to this system: builds the image from a
# reviewed commit, creates its own access key, and adds it to compose.yml on the internal
# network only. Run as root. Safe to run again: it keeps an existing key.
set -euo pipefail

COMMIT="ef8d4593116c1dea43c252cdf86014b04e8abfd3"
BASE=/opt/project-nomad
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC=/tmp/openjarvis-src

if ! docker image inspect nomad-jarvis:local >/dev/null 2>&1; then
  rm -rf "$SRC"
  git clone -q https://github.com/open-jarvis/OpenJarvis.git "$SRC"
  git -C "$SRC" checkout -q "$COMMIT"
  # Upstream's Dockerfile pins Rust 1.88, but a dependency at this commit needs 1.89.
  sed 's/toolchain install 1\.88/toolchain install 1.89/; s/rustup default 1\.88/rustup default 1.89/' \
    "$SRC/deploy/docker/Dockerfile" > /tmp/Dockerfile.jarvis
  docker build -f /tmp/Dockerfile.jarvis -t nomad-jarvis:local --label "openjarvis.commit=$COMMIT" "$SRC"
fi

# The container runs unprivileged and must own its data folder.
mkdir -p "$BASE/storage/jarvis"
chown "$(docker run --rm --entrypoint id nomad-jarvis:local -u)" "$BASE/storage/jarvis"
install -m 644 "$HERE/config.toml" "$BASE/jarvis-config.toml"

if [ ! -f "$BASE/jarvis.env" ]; then
  umask 077
  echo "OPENJARVIS_API_KEY=$(openssl rand -hex 32)" > "$BASE/jarvis.env"
fi

python3 "$HERE/add_to_compose.py" "$BASE/compose.yml"
