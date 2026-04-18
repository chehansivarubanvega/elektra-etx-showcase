<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ELEKTRA ETX Showcase

High-end vehicle showcase landing page for ELEKTRA ETX, featuring immersive 3D sequences and brutalist design. Built with Next.js 15, React 19, Tailwind CSS, Three.js / React Three Fiber, GSAP, and Motion.

## Run locally

**Prerequisites:** Node.js 20+

```bash
npm install
cp .env.example .env.local   # fill in values as needed
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel

This project is configured for Vercel (see `vercel.json`). Two options:

### Option A — Git integration (recommended)
1. Push this repo to GitHub / GitLab / Bitbucket.
2. In the [Vercel dashboard](https://vercel.com/new), click **Add New → Project** and import the repo.
3. Vercel auto-detects Next.js. Leave the defaults (Framework: `Next.js`, Build: `next build`, Output: `.next`).
4. Add any environment variables (e.g. `GEMINI_API_KEY`) in **Settings → Environment Variables**.
5. Click **Deploy**. Every push to `main` ships to production; PR branches get preview URLs.

### Option B — Vercel CLI
```bash
npm i -g vercel
vercel login
vercel          # first run: link the project
vercel --prod   # production deploy
```

### Environment variables
Set these in **Project Settings → Environment Variables** on Vercel:

| Key | Required | Notes |
| --- | --- | --- |
| `GEMINI_API_KEY` | Optional | Only needed if Gemini features are used. |
| `NEXT_PUBLIC_APP_URL` | Optional | Public site URL; prefer the auto-injected `VERCEL_URL`. |

### Build output
The Next.js config no longer uses `output: 'standalone'` — Vercel builds the app natively using its own runtime. If you need to self-host via Docker again, re-enable that option in `next.config.ts`.

## Scripts
- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run start` — run the production build locally
- `npm run lint` — ESLint
