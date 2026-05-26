#!/bin/bash

# Block npm/npx commands — this project uses pnpm exclusively.
# Cursor hook: beforeShellExecution

input=$(cat)
command=$(echo "$input" | jq -r '.command // empty')

if [[ "$command" =~ ^npm[[:space:]] ]] || [[ "$command" =~ ^npx[[:space:]] ]] || [[ "$command" == "npm" ]] || [[ "$command" == "npx" ]]; then
  cat <<EOF
{
  "permission": "deny",
  "user_message": "Este projeto usa pnpm exclusivamente. Use 'pnpm install', 'pnpm add', 'pnpm dlx' ou 'pnpm run' no lugar de npm/npx.",
  "agent_message": "ERROR: This project uses pnpm exclusively. NEVER use npm or npx.\n\nInstead use:\n  • 'pnpm install' instead of 'npm install'\n  • 'pnpm add' instead of 'npm add'\n  • 'pnpm dlx' instead of 'npx'\n  • 'pnpm run' instead of 'npm run'\n\nSee CLAUDE.md and AGENTS.md for details."
}
EOF
  exit 0
fi

echo '{ "permission": "allow" }'
exit 0
