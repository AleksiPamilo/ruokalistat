# Lunch Dashboard

A zero-dependency, minimalist, side-by-side lunch dashboard comparing Ravintola Kamu (Jamix) and Compass Group.

## Stack

- TypeScript
- Cloudflare Pages (with Pages Functions for edge proxying and CORS bypass)
- Tailwind CSS (via CDN, no build step)

## Structure

```text
lunch-dashboard/
├── functions/
│   └── api/
│       └── menu.ts         # Cloudflare Pages Function (Worker backend)
├── public/
│   └── index.html          # Clean frontend UI
├── types.ts                 # Shared frontend/backend contract
├── tsconfig.json            # Type checking config
├── package.json
└── README.md
```

## Development

```bash
pnpm install
pnpm run check   # tsc --noEmit
pnpm exec wrangler pages dev public   # run locally at http://localhost:8788
```

## Deployment (Cloudflare Pages via GitHub)

1. Push this repository to GitHub.
2. In the Cloudflare Dashboard, go to **Compute (Workers) > Workers & Pages > Create > Pages > Connect to Git**, and select the repository.
3. Configure build settings:
   - **Framework preset**: None
   - **Build command**: `pnpm run check` (optional, or leave empty) — Cloudflare Pages auto-detects pnpm from `pnpm-lock.yaml`
   - **Build output directory**: `public`
4. Save and deploy. Pushes to `main` auto-redeploy.

The frontend is served from `public/`, and `functions/api/menu.ts` is deployed as a serverless edge endpoint at `/api/menu`.
