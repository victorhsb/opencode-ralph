#!/bin/bash
# Install script for Ralph Wiggum CLI

set -e

echo "Installing Ralph Wiggum CLI..."

# Check for Bun
if ! command -v bun &> /dev/null; then
    echo "Error: Bun is required but not installed."
    echo "Install Bun: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# OpenCode CLI is NOT required - we use the SDK
# But warn if OpenCode CLI is not installed (for reference)
if ! command -v opencode &> /dev/null; then
    echo "Note: OpenCode CLI not found. Not required - uses SDK."
    echo "      Install if you want CLI access: npm install -g opencode-ai"
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Install dependencies
echo "Installing dependencies..."
cd "$SCRIPT_DIR"
bun install

# Link package (makes 'ralph' command available)
echo "Linking ralph command..."
bun link

echo ""
echo "Installation complete!"
echo ""
echo "Usage:"
echo ""
echo "  CLI Loop:"
echo "    ralph \"Your task\" --max-iterations 10"
echo "    ralph --help"
echo ""
echo "Learn more: https://ghuntley.com/ralph/"
