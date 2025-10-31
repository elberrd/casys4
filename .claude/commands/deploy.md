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

## Manual Steps Required (One-Time Setup)

**IMPORTANT**: Complete these steps in the Vercel dashboard ONE TIME:

### Step 1: Configure Build Command
1. Go to: https://vercel.com/elberrds-projects/casys4/settings/general
2. Scroll to "Build & Development Settings"
3. Override "Build Command" with: `npx convex deploy --cmd 'pnpm run build'`
4. Click "Save"

### Step 2: Add CONVEX_DEPLOY_KEY Environment Variable
1. Go to: https://vercel.com/elberrds-projects/casys4/settings/environment-variables
2. Click "Add New" or "Add Another"
3. **Key**: `CONVEX_DEPLOY_KEY`
4. **Value**: Get from Convex Dashboard → Project Settings → Deploy Keys
   - Click "Generate Production Deploy Key"
   - Copy the key (format: `prod:deployment-name|base64string`)
5. **Environments**: Check "Production", "Preview", and "Development" (All Environments)
6. Click "Save"
7. **IMPORTANT**: Click the "Redeploy" button when prompted after saving

### Why These Steps Are Necessary
- Vercel needs the build command override to run Convex deployment before Next.js build
- The CONVEX_DEPLOY_KEY must be set for "All Environments" to be available during the build process
- After adding/updating environment variables, you MUST trigger a redeploy for changes to take effect

## Optional: Import Development Data to Production

If you want to transfer your development data to production (useful for initial setup):

### Method 1: One-Line Command (Recommended)
```bash
npx convex export --path ./backup.zip && npx convex import --prod --replace ./backup.zip
```

This will:
1. Export all data from your development deployment to `backup.zip`
2. Import that data into production, replacing any existing data

### Method 2: Two-Step Process
```bash
# Step 1: Export from development
npx convex export --path ./backup.zip

# Step 2: Import to production (with confirmation)
npx convex import --prod --replace ./backup.zip
```

### Options
- `--replace`: Replaces existing data in matching tables
- `--append`: Appends to existing data instead of replacing
- `--include-file-storage`: Also exports/imports uploaded files

### Important Notes
⚠️ **WARNING**: Using `--replace` will overwrite ALL data in production tables that exist in the export!

- Data import preserves `_id` and `_creationTime` fields, so relationships between tables are maintained
- The import is atomic - queries won't see partial import states
- Only tables in the export file are affected; other tables remain unchanged
- After import, you may need to reset any streaming export integrations (Fivetran, Airbyte)

### Use Cases
- **Initial production setup**: Seed production with real-looking data from development
- **Testing**: Import sample data for testing production deployment
- **Backup restore**: Restore from a previous backup if needed

## Deployment Process

After the manual steps above are complete, deployments are automatic:

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

### "Invalid Convex deploy key" Error
If you see `AuthenticationFailed: Invalid Convex deploy key` in build logs:

1. **Verify the deploy key is correct**:
   - Go to Convex Dashboard → Settings → Deploy Keys
   - Copy the Production deploy key exactly (including `prod:` prefix)

2. **Re-enter the environment variable**:
   - Go to Vercel → Settings → Environment Variables
   - Click on CONVEX_DEPLOY_KEY → Edit
   - Clear the value completely
   - Paste the deploy key again (ensure no extra spaces)
   - **CRITICAL**: Select "Production", "Preview", AND "Development" (All Environments)
   - Save

3. **Trigger a new deployment**:
   - Click "Redeploy" button in the notification banner, OR
   - Go to Deployments → Latest deployment → "..." menu → Redeploy

4. **Verify environment variable scope**:
   - The variable MUST be checked for all three environments
   - Without all environments checked, the variable won't be available during build

### Build Command Not Found
If Convex deploy command isn't running:
1. Verify build command override in Project Settings → General
2. Ensure it's exactly: `npx convex deploy --cmd 'pnpm run build'`
3. Check that override toggle is enabled (blue)

### Other Issues
- **Check Vercel build logs**: https://vercel.com/elberrds-projects/casys4
- **Check Convex deployment**: https://dashboard.convex.dev/d/pleasant-mosquito-546
- **Verify environment variables**: All three environments should be checked
- **Clear build cache**: Use `vercel --prod --force` to force rebuild
