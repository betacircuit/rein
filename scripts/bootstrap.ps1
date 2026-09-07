[CmdletBinding()]
param(
  [switch]$InstallSupabaseSkills,
  [switch]$NoConfigCopy
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js is required. Install Node.js 22 LTS or newer first."
}

$NodeMajor = [int]((& node -p "Number(process.versions.node.split('.')[0])").Trim())
if ($NodeMajor -lt 22) {
  throw "Node.js 22 or newer is recommended. Found $(& node --version)."
}

if (Get-Command corepack -ErrorAction SilentlyContinue) {
  try { corepack enable | Out-Null } catch { Write-Warning "Corepack enable failed; continue if pnpm is already available." }
}

if (-not $NoConfigCopy) {
  New-Item -ItemType Directory -Force .codex | Out-Null
  if (-not (Test-Path .codex/config.toml)) {
    Copy-Item .codex/config.toml.example .codex/config.toml
    Write-Host "Created .codex/config.toml from the safe example."
  } else {
    Write-Host "Kept existing .codex/config.toml."
  }

  if (-not (Test-Path .mcp.json)) {
    Copy-Item .mcp.json.example .mcp.json
    Write-Host "Created .mcp.json for compatible project-scoped MCP clients."
  } else {
    Write-Host "Kept existing .mcp.json."
  }
}

if ($InstallSupabaseSkills) {
  Write-Host "Installing official Supabase Agent Skills at project scope..."
  & npx skills add supabase/agent-skills
  if ($LASTEXITCODE -ne 0) { throw "Supabase Agent Skills installation failed." }
}

& node scripts/check-spec-coverage.mjs
if ($LASTEXITCODE -ne 0) { throw "Specification coverage check failed." }

& node scripts/generate-manifest.mjs
if ($LASTEXITCODE -ne 0) { throw "Manifest generation failed." }

& node scripts/verify-pack.mjs
if ($LASTEXITCODE -ne 0) { throw "Pack verification failed." }

Write-Host ""
Write-Host "Bootstrap checks passed."
Write-Host "1. Read START_HERE.md and MCP_AND_SKILLS_SETUP.md."
Write-Host "2. Replace only development placeholders in .codex/config.toml."
Write-Host "3. Run 'codex mcp list' and start Codex in this repository."
Write-Host "4. Paste MASTER_CODEX_PROMPT.md as the first build instruction."
