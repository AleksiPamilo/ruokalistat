# Lunch Dashboard

A zero-dependency, minimalist, side-by-side lunch dashboard comparing Ravintola Kamu (Jamix) and Opetustalo (Compass Group).

## Stack

- TypeScript
- Cloudflare Workers (with static assets) — a single Worker serves `public/` and handles `/api/menu`
- Tailwind CSS (via CDN, no build step)

## Structure

```text
lunch-dashboard/
├── src/
│   └── worker.ts        # Worker entry point: routes /api/menu, serves public/ otherwise
├── public/
│   └── index.html       # Clean frontend UI
├── types.ts              # Shared frontend/backend contract
├── wrangler.jsonc         # Worker + static assets config
├── tsconfig.json          # Type checking config
├── package.json
└── README.md
```

## Development

```bash
pnpm install
pnpm run check   # tsc --noEmit
pnpm run dev      # wrangler dev, http://localhost:8787
```

## Deployment (Cloudflare Workers via GitHub)

1. Push this repository to GitHub.
2. In the Cloudflare Dashboard, go to **Compute (Workers) > Workers & Pages > Create application > Connect to Git**, and select the repository.
3. Cloudflare auto-detects the Worker from `wrangler.jsonc` and the pnpm project from `pnpm-lock.yaml` — no build command or output directory needed.
4. Save and deploy. Pushes to `main` auto-redeploy.

Alternatively, deploy directly from the CLI:

```bash
pnpm run deploy   # wrangler deploy
```

The Worker (`src/worker.ts`) serves `public/` as static assets for every request, except `/api/menu`, which it handles itself as a serverless edge endpoint.
