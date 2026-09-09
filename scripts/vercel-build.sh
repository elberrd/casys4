#!/bin/sh
# Vercel build: deploy Convex only from Production.
# Preview/dev keep the production CONVEX_DEPLOY_KEY in env, and Convex CLI
# refuses `convex deploy` there ("non-production build environment").
# Preview still builds Next.js against NEXT_PUBLIC_CONVEX_URL.
set -eu

if [ "${VERCEL_ENV:-}" = "production" ]; then
  echo "vercel-build: production — deploying Convex, then Next.js"
  pnpm exec convex deploy --cmd "pnpm run build"
  echo "vercel-build: seeding built-in report templates"
  pnpm exec convex run internal.reportTemplateSeeds.upsertBuiltInTemplates \
    || echo "vercel-build: WARN: report template seed skipped"
else
  echo "vercel-build: ${VERCEL_ENV:-local} — skipping Convex deploy (preview/dev)"
  pnpm run build
fi
