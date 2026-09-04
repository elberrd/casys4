#!/usr/bin/env bash
# Self-contained, idempotent bootstrap for the CASYS4 Cloud Agent environment.
# Runs after the repository is checked out. Reproduces the full dev backend from
# scratch so no external snapshot or dashboard "Save" is required — merging the
# committed .cursor/environment.json is enough.
set -euo pipefail

# Resolve repo root (this script lives in .cursor/).
cd "$(dirname "$0")/.."

# Ensure pnpm is available (repo pins pnpm via package.json "packageManager").
corepack enable >/dev/null 2>&1 || true

# 1. Install JS dependencies from the committed lockfile.
pnpm install --frozen-lockfile

# 2. Recreate the git-ignored local env file consumed by Next.js and the Convex
#    CLI. next dev reads NEXT_PUBLIC_CONVEX_URL from here at startup.
if [ ! -f .env.local ]; then
  cat > .env.local <<'EOF'
# Local anonymous Convex backend (CONVEX_AGENT_MODE=anonymous)
CONVEX_DEPLOYMENT=anonymous:anonymous-agent

NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210
EOF
fi

# 3. One-time Convex bootstrap.
#    Cloud Agents can't log into a Convex cloud deployment, so the app uses a
#    local backend in anonymous agent mode. This step provisions that
#    deployment, pushes the schema/functions, configures Convex Auth (JWT keys +
#    SITE_URL) and seeds a dev admin. All of this state lives under ~/.convex; a
#    sentinel guards it so the heavy work runs only once per machine. The
#    long-running backend is owned by the `convex` terminal at runtime — here we
#    start it briefly only for setup and stop it before returning.
export CONVEX_AGENT_MODE=anonymous
BOOTSTRAP_SENTINEL="${HOME}/.convex/.casys4-bootstrapped"

# Test admin used by the /test flow (same credentials documented in AGENTS.md).
ADMIN_EMAIL="elber@impactus.ai"
ADMIN_PASSWORD="Senha@123"
ADMIN_NAME="Elber Rodriguez"

if [ -f "${BOOTSTRAP_SENTINEL}" ]; then
  echo "[install] Convex already bootstrapped; skipping."
  exit 0
fi

echo "[install] Bootstrapping local Convex deployment (one-time)…"

BOOTSTRAP_LOG="/tmp/casys4-convex-bootstrap.log"
: > "${BOOTSTRAP_LOG}"

# Start the local backend in the background just for setup.
pnpm exec convex dev >"${BOOTSTRAP_LOG}" 2>&1 &
CONVEX_BOOTSTRAP_PID=$!

# Always stop the temporary backend, even if a step below fails.
cleanup_backend() {
  kill "${CONVEX_BOOTSTRAP_PID}" >/dev/null 2>&1 || true
  wait "${CONVEX_BOOTSTRAP_PID}" 2>/dev/null || true
}
trap cleanup_backend EXIT

# Wait until the backend is serving and functions have been pushed.
for _ in $(seq 1 180); do
  if grep -q "Convex functions ready" "${BOOTSTRAP_LOG}" 2>/dev/null; then break; fi
  sleep 1
done

# Configure Convex Auth (JWT_PRIVATE_KEY, JWKS, SITE_URL) if not already set.
if ! pnpm exec convex env list 2>/dev/null | grep -q '^JWT_PRIVATE_KEY'; then
  yes | pnpm exec auth --skip-git-check --allow-dirty-git-state \
    --web-server-url http://localhost:3000 || echo "[install] WARN: Convex Auth setup returned non-zero"
fi

# Seed the dev admin so sign-in works out of the box (idempotent).
pnpm exec convex run seedDevAdmin:default \
  "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\",\"fullName\":\"${ADMIN_NAME}\"}" \
  >/dev/null 2>&1 || echo "[install] WARN: dev admin seed skipped"

# Only mark bootstrap complete if Convex Auth is confirmed configured; otherwise
# leave the sentinel absent so the next install retries.
if pnpm exec convex env list 2>/dev/null | grep -q '^JWT_PRIVATE_KEY'; then
  touch "${BOOTSTRAP_SENTINEL}"
  echo "[install] Convex bootstrap complete."
else
  echo "[install] WARN: Convex Auth not confirmed; bootstrap will retry on next install."
fi

cleanup_backend
trap - EXIT
