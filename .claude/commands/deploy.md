# Deploy to Production

This command deploys the application to production using Vercel and Convex.

## Current Deployment Status

- **Vercel Project**: casys4 (elberrds-projects)
- **Production URL**: https://casys4.vercel.app
- **Convex Production**: https://pleasant-mosquito-546.convex.cloud
- **GitHub**: elberrd/casys4 (main branch)

## One-Time Setup (Already Completed)

✅ Vercel project created and linked to GitHub
✅ Convex production deploy key added to Vercel
✅ Environment variables copied from dev to production

## Manual Step Required

**IMPORTANT**: You need to configure the build command in Vercel dashboard ONE TIME:

1. Go to: https://vercel.com/elberrds-projects/casys4/settings/general
2. Scroll to "Build & Development Settings"
3. Override "Build Command" with: `npx convex deploy --cmd 'pnpm run build'`
4. Click "Save"

This tells Vercel to deploy Convex functions before building the frontend.

## Deployment Process

After the manual step above is complete, deployments are automatic:

### Automatic Deployments (via GitHub):
- Push to `main` branch triggers production deployment
- Vercel automatically:
  1. Runs `npx convex deploy` (deploys Convex functions)
  2. Runs `pnpm run build` (builds Next.js app)
  3. Deploys to https://casys4.vercel.app

### Manual Deployment (via CLI):
```bash
# Deploy production build locally
CONVEX_DEPLOY_KEY='your-key-here' npx convex deploy --cmd 'pnpm run build'

# Then deploy to Vercel
vercel --prod
```

## Environment Variables

### Vercel (Production):
- ✅ `CONVEX_DEPLOY_KEY` - Set (enables automatic Convex deployment)

### Convex Production:
- ✅ `JWKS` - JSON Web Key Set for authentication
- ✅ `JWT_PRIVATE_KEY` - Private key for JWT signing
- ✅ `SITE_URL` - https://casys4.vercel.app

## Deployment URLs

- **Production**: https://casys4.vercel.app
- **Vercel Dashboard**: https://vercel.com/elberrds-projects/casys4
- **Convex Dashboard**: https://dashboard.convex.dev/d/pleasant-mosquito-546

## Troubleshooting

If deployment fails:
1. Check Vercel build logs: https://vercel.com/elberrds-projects/casys4
2. Verify CONVEX_DEPLOY_KEY is set in Vercel environment variables
3. Ensure build command is set correctly in Project Settings
4. Check Convex functions deployed: https://dashboard.convex.dev/d/pleasant-mosquito-546
