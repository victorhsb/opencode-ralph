#!/bin/bash
#
# Ralph Command Validator
#
# This script validates ralph commands to ensure they are safe to execute.
# It blocks ralph "<prompt>" commands which should only be run by users,
# not AI agents.
#
# Usage:
#   ./validate-ralph-command.sh "ralph command here"
#
# Exit codes:
#   0 - Command is safe (management command)
#   1 - Command is forbidden (would launch a loop)
#   2 - Invalid usage

set -euo pipefail

COMMAND="${1:-}"

if [ -z "$COMMAND" ]; then
    echo "Error: No command provided"
    echo "Usage: $0 \"<ralph command>\""
    exit 2
fi

# Check if command starts with "ralph"
if [[ ! "$COMMAND" =~ ^ralph ]]; then
    echo "✓ Command does not start with 'ralph' - not a ralph command"
    exit 0
fi

# List of forbidden patterns (these launch loops)
FORBIDDEN_PATTERNS=(
    '^ralph\s+"'                    # ralph "..." (quoted prompt)
    '^ralph\s+\x27'                 # ralph '...' (single quoted)
    '^ralph\s+-p\s+'                # ralph -p ...
    '^ralph\s+--prompt\s+'          # ralph --prompt ...
    '^ralph\s+-f\s+'                # ralph -f ...
    '^ralph\s+--file\s+'            # ralph --file ...
)

# Check against forbidden patterns
for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
    if [[ "$COMMAND" =~ $pattern ]]; then
        echo "✗ FORBIDDEN: This command would launch a ralph loop"
        echo "   Command: $COMMAND"
        echo ""
        echo "Ralph loops must be run by users, not AI agents."
        echo "Provide this command to the user instead of executing it."
        exit 1
    fi
done

# List of allowed management commands
ALLOWED_PATTERNS=(
    '^ralph\s+init'
    '^ralph\s+task\s+add'
    '^ralph\s+task\s+remove'
    '^ralph\s+task\s+list'
    '^ralph\s+--status'
    '^ralph\s+--add-context'
    '^ralph\s+--clear-context'
    '^ralph\s+--list-suggestions'
    '^ralph\s+--approve-suggestion'
    '^ralph\s+--reject-suggestion'
    '^ralph\s+-v'
    '^ralph\s+--version'
    '^ralph\s+--help'
    '^ralph\s+-h'
)

# Check against allowed patterns
for pattern in "${ALLOWED_PATTERNS[@]}"; do
    if [[ "$COMMAND" =~ $pattern ]]; then
        echo "✓ SAFE: This is a management command"
        echo "   Command: $COMMAND"
        exit 0
    fi
done

# If we get here, command is unrecognized
echo "? UNKNOWN: Cannot determine if this command is safe"
echo "   Command: $COMMAND"
echo ""
echo "Please review before executing."
exit 1
