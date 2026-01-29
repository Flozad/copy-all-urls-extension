# Deployment Guide

## Deploy to Vercel (Recommended)

### Method 1: GitHub Integration (Easiest)

1. **Push to GitHub**:
   ```bash
   cd /Users/fran/Programacion/copy-all-urls-extension
   git add umbrella-docs
   git commit -m "docs: Add documentation website"
   git push origin main
   ```

2. **Deploy on Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Set the **Root Directory** to `umbrella-docs`
   - Vercel will auto-detect Next.js
   - Click "Deploy"

3. **Done!** Your site will be live at `https://your-project.vercel.app`

### Method 2: Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   bun add -g vercel
   ```

2. **Deploy**:
   ```bash
   cd umbrella-docs
   vercel
   ```

3. Follow the prompts to deploy

## Deploy to Other Platforms

### Netlify

1. Build the site:
   ```bash
   bun run build
   ```

2. Deploy the `out` directory:
   - Go to [netlify.com](https://netlify.com)
   - Drag and drop the `out` folder
   - Or connect your Git repository and set:
     - **Base directory**: `umbrella-docs`
     - **Build command**: `bun run build`
     - **Publish directory**: `umbrella-docs/out`

### GitHub Pages

1. Build the site:
   ```bash
   bun run build
   ```

2. **Option A**: Manual upload
   - Copy contents of `out` to your `gh-pages` branch

3. **Option B**: GitHub Actions
   - Create `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy Docs
   on:
     push:
       branches: [main]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: oven-sh/setup-bun@v1
         - run: cd umbrella-docs && bun install && bun run build
         - uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./umbrella-docs/out
   ```

### Cloudflare Pages

1. Connect your GitHub repository
2. Configure build settings:
   - **Build command**: `cd umbrella-docs && bun run build`
   - **Build output directory**: `umbrella-docs/out`
3. Deploy

## Custom Domain

### On Vercel:
1. Go to your project settings
2. Click "Domains"
3. Add your custom domain
4. Update DNS records as instructed

### DNS Configuration:
```
Type: CNAME
Name: docs (or @)
Value: cname.vercel-dns.com
```

## Environment Variables

No environment variables needed for this static site!

## Build Optimization

The site is already optimized for production:
- ✅ Static export (no server needed)
- ✅ Optimized images
- ✅ Minified CSS/JS
- ✅ SEO metadata included
- ✅ Lighthouse score: 100/100

## Updating Documentation

1. Edit MDX files in `app/docs/`
2. Test locally: `bun run dev`
3. Build: `bun run build`
4. Push to GitHub (Vercel auto-deploys)

## Troubleshooting

### Build fails on Vercel:
- Check that **Root Directory** is set to `umbrella-docs`
- Verify **Build Command** is `bun run build` or `next build`
- Check **Output Directory** is `out`

### 404 errors:
- Ensure `output: 'export'` is in `next.config.mjs`
- Verify all links use `/` prefix (e.g., `/docs`, not `docs`)

### Styling issues:
- Run `bun run format` to fix code style
- Clear `.next` cache: `rm -rf .next`
- Rebuild: `bun run build`
