#!/bin/bash

# Extract the command from TOOL_USE JSON
COMMAND=$(echo "$TOOL_USE" | jq -r '.parameters.command // ""')

# Check if command starts with npm or npx
if [[ "$COMMAND" =~ ^npm[[:space:]] ]] || [[ "$COMMAND" =~ ^npx[[:space:]] ]] || [[ "$COMMAND" == "npm" ]] || [[ "$COMMAND" == "npx" ]]; then
  # Deny the command with error message
  cat <<EOF
{
  "hookEventName": "PreToolUse",
  "permissionDecision": "deny",
  "permissionDecisionReason": "❌ ERROR: This project uses pnpm exclusively. NEVER use npm or npx.\n\nInstead use:\n  • 'pnpm install' instead of 'npm install'\n  • 'pnpm add' instead of 'npm add'\n  • 'pnpm dlx' instead of 'npx'\n  • 'pnpm run' instead of 'npm run'\n\nSee CLAUDE.md for more details."
}
EOF
else
  # Approve the command
  cat <<EOF
{
  "hookEventName": "PreToolUse",
  "permissionDecision": "allow"
}
EOF
fi
