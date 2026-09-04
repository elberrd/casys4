#!/usr/bin/env bash
# Idempotent bootstrap for the CASYS4 Cloud Agent environment.
# Runs after the repository is checked out. Keep it fast and repeatable.
set -euo pipefail

# Resolve repo root (this script lives in .cursor/).
cd "$(dirname "$0")/.."

# Ensure pnpm is available (repo pins pnpm via package.json "packageManager").
corepack enable >/dev/null 2>&1 || true

# 1. Install JS dependencies from the committed lockfile.
pnpm install --frozen-lockfile

# 2. Recreate the local env file consumed by Next.js and the Convex CLI.
#    The Convex backend runs in anonymous agent mode; its data and deployment
#    environment variables (JWT keys, SITE_URL, seeded data) live under
#    ~/.convex, which is preserved by the environment snapshot. .env.local is
#    git-ignored, so it must be recreated deterministically after a fresh
#    checkout. next dev reads NEXT_PUBLIC_CONVEX_URL from here at startup.
if [ ! -f .env.local ]; then
  cat > .env.local <<'EOF'
# Local anonymous Convex backend (see CONVEX_AGENT_MODE=anonymous)
CONVEX_DEPLOYMENT=anonymous:anonymous-agent

NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210
EOF
fi
