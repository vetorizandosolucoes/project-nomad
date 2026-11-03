#!/usr/bin/env python3
"""Adds the jarvis service to compose.yml and gives the admin its address and key."""
import shutil
import sys

path = sys.argv[1]
with open(path, encoding='utf8') as handle:
    text = handle.read()

if 'container_name: nomad_jarvis' in text:
    print('jarvis ja esta no compose')
    raise SystemExit(0)

SERVICE = """  jarvis:
    image: nomad-jarvis:local
    pull_policy: never
    container_name: nomad_jarvis
    restart: unless-stopped
    env_file: /opt/project-nomad/jarvis.env
    environment:
      - OPENJARVIS_CONFIG=/etc/jarvis/config.toml
      - OLLAMA_HOST=http://nomad_ollama:11434
    volumes:
      - /opt/project-nomad/jarvis-config.toml:/etc/jarvis/config.toml:ro
      - /opt/project-nomad/storage/jarvis:/home/openjarvis/.openjarvis
"""

shutil.copy(path, path + '.bak-jarvis')
head, services, tail = text.partition('services:\n')
lines = tail.split('\n')
out, in_admin_env = [], False
for line in lines:
    out.append(line)
    if line.startswith('  admin:'):
        in_admin_env = True
    elif in_admin_env and line.strip() == 'environment:':
        out.append('      - JARVIS_URL=http://nomad_jarvis:8000')
        in_admin_env = False
        out.insert(len(out) - 2, '    env_file: /opt/project-nomad/jarvis.env')
with open(path, 'w', encoding='utf8') as handle:
    handle.write(head + services + SERVICE + '\n'.join(out))
print('jarvis adicionado; copia em', path + '.bak-jarvis')
