# Deployment Guide

## Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create a new repository named `impromptu` (or your preferred name)
3. **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click "Create repository"

## Step 2: Push to GitHub

After creating the repository, GitHub will show you commands. Run these in your terminal:

```bash
# Add the remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/impromptu.git

# Or if you prefer SSH:
# git remote add origin git@github.com:YOUR_USERNAME/impromptu.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to [Vercel](https://vercel.com)
2. Sign in with your GitHub account
3. Click "New Project"
4. Import your `impromptu` repository
5. Vercel will auto-detect Next.js settings
6. Click "Deploy"

Vercel will automatically:
- Build your Next.js app
- Deploy it to a production URL
- Set up automatic deployments on every push to main

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Deploy (from project directory)
vercel

# Follow the prompts to link your project
```

### Important Notes for Vercel Deployment

**Database Considerations:**
- SQLite works on Vercel for serverless functions but has limitations
- Each serverless function instance has its own file system
- For production with high traffic, consider:
  - Using a managed database (PostgreSQL, MySQL)
  - Using Vercel KV or Upstash for Redis
  - Using a service like Turso (SQLite-compatible) or PlanetScale

**Initial Setup:**
- After first deployment, you may need to seed the database
- Consider adding a one-time seeding API route or use Vercel CLI to run migrations

**Session Secret:**
- For production, set up a session secret in Vercel environment variables
- Check `src/lib/session.ts` for session configuration

## Step 4: Configure Environment Variables (Optional)

If you need to customize settings, add them in Vercel:

1. Go to your project settings on Vercel
2. Navigate to "Environment Variables"
3. Add any needed variables (session secrets, database URLs, etc.)

## Post-Deployment Checklist

- [ ] Change default admin password (`admin`/`admin123`)
- [ ] Seed the database with questions (if needed)
- [ ] Test the admin login
- [ ] Verify question generation works
- [ ] Check settings are properly configured
- [ ] Test on mobile devices

## Custom Domain (Optional)

1. In Vercel project settings, go to "Domains"
2. Add your custom domain
3. Follow DNS configuration instructions
4. SSL certificate is automatically provisioned

## Monitoring

Vercel provides:
- Deployment analytics
- Function logs
- Performance metrics
- Error tracking

Access these in your Vercel dashboard.
