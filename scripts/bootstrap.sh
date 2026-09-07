#!/usr/bin/env sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"

INSTALL_SKILLS=0
COPY_CONFIG=1

usage() {
  cat <<'USAGE'
Usage: ./scripts/bootstrap.sh [options]

Options:
  --install-supabase-skills  Run the official Supabase Agent Skills installer.
  --no-config-copy           Do not create .codex/config.toml or .mcp.json.
  --help                     Show this help.

The script never asks for secrets, connects production resources, deploys, or
modifies an external service.
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --install-supabase-skills) INSTALL_SKILLS=1 ;;
    --no-config-copy) COPY_CONFIG=0 ;;
    --help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

command -v node >/dev/null 2>&1 || { echo "Node.js is required." >&2; exit 1; }
NODE_MAJOR=$(node -p "Number(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "Node.js 22 or newer is recommended; found $(node --version)." >&2
  exit 1
fi

if command -v corepack >/dev/null 2>&1; then
  corepack enable >/dev/null 2>&1 || true
fi

if [ "$COPY_CONFIG" -eq 1 ]; then
  mkdir -p .codex
  if [ ! -f .codex/config.toml ]; then
    cp .codex/config.toml.example .codex/config.toml
    echo "Created .codex/config.toml from the safe example."
  else
    echo "Kept existing .codex/config.toml."
  fi
  if [ ! -f .mcp.json ]; then
    cp .mcp.json.example .mcp.json
    echo "Created .mcp.json for compatible project-scoped MCP clients."
  else
    echo "Kept existing .mcp.json."
  fi
fi

if [ "$INSTALL_SKILLS" -eq 1 ]; then
  echo "Installing official Supabase Agent Skills at project scope..."
  npx skills add supabase/agent-skills
fi

node scripts/check-spec-coverage.mjs
node scripts/generate-manifest.mjs
node scripts/verify-pack.mjs

cat <<'NEXT'

Bootstrap checks passed.
Next:
1. Read START_HERE.md and MCP_AND_SKILLS_SETUP.md.
2. Replace only development placeholders in .codex/config.toml.
3. Run `codex mcp list` and start Codex in this repository.
4. Paste MASTER_CODEX_PROMPT.md as the first build instruction.
NEXT
