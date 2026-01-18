# Deployment Guide

This guide covers deploying Reading KG PWA to various platforms.

## GitHub Pages (Recommended)

### Prerequisites

1. GitHub repository
2. Supabase project with:
   - Database schema applied
   - Google OAuth configured
   - Site URL set to your GitHub Pages URL

### Step 1: Configure Supabase

1. Go to Supabase Dashboard > Authentication > URL Configuration
2. Set Site URL: `https://<username>.github.io/<repo-name>/`
3. Add Redirect URL: `https://<username>.github.io/<repo-name>/auth/callback`

### Step 2: Add Repository Secrets

Go to Repository Settings > Secrets and Variables > Actions:

| Secret Name | Value |
|-------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

### Step 3: Enable GitHub Pages

1. Go to Repository Settings > Pages
2. Source: GitHub Actions

### Step 4: Deploy

Push to `main` branch. GitHub Actions will automatically build and deploy.

### Step 5: Update next.config.js (if using subpath)

If your site is at `https://username.github.io/repo-name/`, update:

```js
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: '/repo-name',  // Add this line
  assetPrefix: '/repo-name/',  // Add this line
};
```

---

## Vercel

### Step 1: Import Project

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository

### Step 2: Configure Environment Variables

Add in Vercel Dashboard > Settings > Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 3: Update Build Settings

- Framework Preset: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`

### Step 4: Configure Supabase Redirect

Add your Vercel URL to Supabase Authentication > URL Configuration.

---

## Netlify

### Step 1: Connect Repository

1. Go to [netlify.com](https://netlify.com)
2. Add new site from Git

### Step 2: Configure Build

- Build Command: `npm run build`
- Publish Directory: `out`

### Step 3: Environment Variables

Add in Site Settings > Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 4: Configure Redirects

Create `public/_redirects`:
```
/*    /index.html   200
```

---

## Self-Hosted (Docker)

### Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/out /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Build & Run

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=your-url \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key \
  -t reading-kg-pwa .

docker run -p 8080:80 reading-kg-pwa
```

---

## Troubleshooting

### OAuth Redirect Issues

- Ensure redirect URLs match exactly in Supabase
- Check for trailing slashes
- Verify HTTPS is used in production

### 404 on Page Refresh

- Ensure `404.html` exists in `public/`
- Configure your hosting for SPA redirects

### Environment Variables Not Working

- Prefix with `NEXT_PUBLIC_` for client-side access
- Rebuild after changing environment variables

### PWA Not Installing

- Serve over HTTPS
- Ensure `manifest.json` is accessible
- Check browser DevTools > Application > Manifest
