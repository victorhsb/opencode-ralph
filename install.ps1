# Install script for Ralph Wiggum CLI (Windows)

$ErrorActionPreference = "Stop"

Write-Host "Installing Ralph Wiggum CLI..."

# Check for Bun
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
  Write-Error "Bun is required but not installed. Install Bun: https://bun.sh"
  exit 1
}

# OpenCode CLI is NOT required - we use the SDK
# But warn if OpenCode CLI is not installed (for reference)
if (-not (Get-Command opencode -ErrorAction SilentlyContinue)) {
  Write-Host "Note: OpenCode CLI not found. Not required - uses SDK."
  Write-Host "      Install if you want CLI access: npm install -g opencode-ai"
}

# Get script directory
$scriptDir = $PSScriptRoot

# Install dependencies
Write-Host "Installing dependencies..."
Push-Location $scriptDir
bun install

# Link package (makes 'ralph' command available)
Write-Host "Linking ralph command..."
bun link

Pop-Location

Write-Host ""
Write-Host "Installation complete!"
Write-Host ""
Write-Host "Usage:"
Write-Host ""
Write-Host "  CLI Loop:"
Write-Host "    ralph \"Your task\" --max-iterations 10"
Write-Host "    ralph --help"
Write-Host ""
Write-Host "Learn more: https://ghuntley.com/ralph/"
