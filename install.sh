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

# Check for OpenCode CLI (required - SDK-only)
if ! command -v opencode &> /dev/null; then
    echo "Error: OpenCode CLI is required but not installed."
    echo "Install OpenCode: npm install -g opencode-ai"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Install dependencies
echo "Installing dependencies..."
cd "$SCRIPT_DIR"
bun install

# Link the package (makes 'ralph' command available)
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
