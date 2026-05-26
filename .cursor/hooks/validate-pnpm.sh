#!/bin/bash

# Block npm/npx/yarn commands — this project uses pnpm exclusively.
# Cursor hook: beforeShellExecution

set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo '{
  "permission": "deny",
  "user_message": "Hook de validação pnpm indisponível (jq não encontrado). Comandos bloqueados por segurança.",
  "agent_message": "ERROR: validate-pnpm hook failed because jq is not installed. Do not run npm/npx/yarn. Use pnpm only."
}' >&1
  exit 2
fi

input=$(cat)
command=$(echo "$input" | jq -r '.command // empty')

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
  "permission": "deny",
  "user_message": "Este projeto usa pnpm exclusivamente. Use 'pnpm install', 'pnpm add', 'pnpm dlx' ou 'pnpm run' no lugar de npm/npx/yarn.",
  "agent_message": "ERROR: This project uses pnpm exclusively. NEVER use npm, npx, or yarn.\n\nInstead use:\n  • 'pnpm install' instead of 'npm install'\n  • 'pnpm add' instead of 'npm add'\n  • 'pnpm run <script>' instead of 'npm run <script>'\n  • 'pnpm dlx <pkg>' instead of 'npx <pkg>'\n  • 'pnpm exec <cmd>' for package binaries\n  • 'pnpm' instead of 'yarn'\n\nSee CLAUDE.md and AGENTS.md for details."
}
EOF
  exit 0
fi

echo '{ "permission": "allow" }'
exit 0
