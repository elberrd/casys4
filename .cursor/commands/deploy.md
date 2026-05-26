# Deploy to Production

Deploy the application to production using Vercel and Convex.

## Steps (run in order)

### 1. Verify Local Build
```bash
pnpm run build
```
If build fails, STOP and fix errors.

### 2. Deploy Convex to Production
```bash
pnpm dlx convex deploy -y
```

### 3. Push to GitHub (only if user explicitly requested)
```bash
git push origin main
```

### 4. Monitor Deployment
- Verify https://casys4.vercel.app is accessible
- Check Vercel and Convex dashboards for errors

## Environment

- **Production URL**: https://casys4.vercel.app
- **Convex Production**: https://pleasant-mosquito-546.convex.cloud
- **Vercel Dashboard**: https://vercel.com/elberrds-projects/casys4
- **Convex Dashboard**: https://dashboard.convex.dev/d/pleasant-mosquito-546

## Build Command (Vercel)

Override: `pnpm dlx convex deploy --cmd 'pnpm run build'`

## Notes

- Never push to git unless the user explicitly asks
- CONVEX_DEPLOY_KEY must be set in Vercel for all environments
- See full troubleshooting in `.claude/commands/deploy.md`
