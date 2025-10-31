# Deploy to Production

This command deploys the application to production using Vercel and Convex.

## Prerequisites
- Vercel CLI installed
- Convex CLI configured
- GitHub CLI installed (gh)

## Steps

### 1. Pre-deployment checks
- Run linting to ensure code quality
- Check for TypeScript errors
- Verify build passes locally

### 2. Setup Vercel project (if not exists)
- Check if Vercel project exists in deployed.yaml
- If not, create new Vercel project linked to GitHub repository
- Get production URL from Vercel

### 3. Configure Convex Production Deployment
- Generate production deploy key if not already set in Vercel
- Copy environment variables from development to production:
  - JWKS
  - JWT_PRIVATE_KEY
  - SITE_URL (updated with Vercel production URL)

### 4. Deploy to Vercel
- Use Vercel CLI to deploy to production
- Build command includes Convex deployment: `npx convex deploy --cmd 'pnpm run build'`
- Vercel will automatically trigger build and deployment

### 5. Post-deployment
- Update deployed.yaml with deployment information:
  - Deployment date/time
  - Vercel URL
  - Convex production deployment URL
  - Environment variables status
  - Git commit hash
- Verify deployment is successful
- Display deployment URLs

## Environment Variables Required

### In Vercel (set via dashboard or CLI):
- `CONVEX_DEPLOY_KEY` - Production deploy key from Convex dashboard

### In Convex Production:
- `JWKS` - JSON Web Key Set for authentication
- `JWT_PRIVATE_KEY` - Private key for JWT signing
- `SITE_URL` - Production URL of the deployed application

## Automated Deployment

Run this command to execute all steps automatically:

```bash
/deploy
```

The command will:
1. Check code quality (lint + type check)
2. Setup or verify Vercel project
3. Configure Convex production environment
4. Deploy to both Convex and Vercel
5. Update deployment tracking file
6. Display deployment information
