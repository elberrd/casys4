#!/bin/bash

# Block npm/npx/yarn commands — this project uses pnpm exclusively.
# Claude Code hook: PreToolUse (Bash)

set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  cat <<EOF
{
  "hookEventName": "PreToolUse",
  "permissionDecision": "deny",
  "permissionDecisionReason": "ERROR: validate-pnpm hook failed because jq is not installed. Do not run npm/npx/yarn. Use pnpm only."
}
EOF
  exit 2
fi

command=$(echo "$TOOL_USE" | jq -r '.parameters.command // ""')

is_blocked=false
if [[ "$command" =~ ^npm([[:space:]]|$) ]] \
  || [[ "$command" =~ ^npx([[:space:]]|$) ]] \
  || [[ "$command" =~ ^yarn([[:space:]]|$) ]] \
  || [[ "$command" =~ ^yarnpkg([[:space:]]|$) ]]; then
  is_blocked=true
fi

if [[ "$is_blocked" == true ]]; then
  cat <<EOF
{
  "hookEventName": "PreToolUse",
  "permissionDecision": "deny",
  "permissionDecisionReason": "ERROR: This project uses pnpm exclusively. NEVER use npm, npx, or yarn.\n\nInstead use:\n  • 'pnpm install' instead of 'npm install'\n  • 'pnpm add' instead of 'npm add'\n  • 'pnpm run <script>' instead of 'npm run <script>'\n  • 'pnpm dlx <pkg>' instead of 'npx <pkg>'\n  • 'pnpm exec <cmd>' for package binaries\n  • 'pnpm' instead of 'yarn'\n\nSee AGENTS.md and CLAUDE.md for more details."
}
EOF
else
  cat <<EOF
{
  "hookEventName": "PreToolUse",
  "permissionDecision": "allow"
}
EOF
fi
