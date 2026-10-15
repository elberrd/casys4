#!/bin/sh
# Vercel build: deploy Convex from Production, and from Preview only when
# CONVEX_DEPLOY_KEY is a preview key (prefix "preview:"). A missing or
# non-preview key on a Preview build is refused so production cannot be
# targeted. Production seed (--prod report templates) is unchanged.
# Preview runs --preview-run seedPreviewUser:seed (ignored on prod) and then
# sets SITE_URL on that Convex preview deployment to the Vercel preview URL.
set -eu

if [ "${VERCEL_ENV:-}" = "production" ]; then
  echo "vercel-build: production — deploying Convex, then Next.js"
  pnpm exec convex deploy --cmd "pnpm run build"
  echo "vercel-build: seeding built-in report templates"
  pnpm exec convex run --prod internal.reportTemplateSeeds.upsertBuiltInTemplates \
    || echo "vercel-build: WARN: report template seed skipped"
elif [ "${VERCEL_ENV:-}" = "preview" ]; then
  case "${CONVEX_DEPLOY_KEY:-}" in
    preview:*)
      echo "vercel-build: preview — deploying convex/ to Convex preview (branch ${VERCEL_GIT_COMMIT_REF:-?})"
      pnpm exec convex deploy --cmd "pnpm run build" --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL --preview-run seedPreviewUser:seed
      if [ -z "${VERCEL_URL:-}" ]; then
        echo "vercel-build: ERROR: VERCEL_URL is unset; cannot set SITE_URL" >&2
        exit 1
      fi
      if [ -z "${VERCEL_GIT_COMMIT_REF:-}" ]; then
        echo "vercel-build: ERROR: VERCEL_GIT_COMMIT_REF is unset; cannot scope SITE_URL to the preview deployment" >&2
        exit 1
      fi
      PREVIEW_SITE_URL="https://${VERCEL_URL}"
      echo "vercel-build: preview — setting Convex SITE_URL=${PREVIEW_SITE_URL} (preview-name=${VERCEL_GIT_COMMIT_REF})"
      pnpm exec convex env set --preview-name "${VERCEL_GIT_COMMIT_REF}" SITE_URL "${PREVIEW_SITE_URL}"
      echo "vercel-build: preview — SITE_URL set on Convex preview deployment"
      ;;
    "")
      echo "vercel-build: ERROR: preview build missing CONVEX_DEPLOY_KEY; refusing" >&2
      exit 1
      ;;
    *)
      echo "vercel-build: ERROR: preview build has a non-preview CONVEX_DEPLOY_KEY; refusing" >&2
      exit 1
      ;;
  esac
else
  echo "vercel-build: ${VERCEL_ENV:-local} — skipping Convex deploy"
  pnpm run build
fi
