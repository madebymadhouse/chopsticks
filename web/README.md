# Chopsticks Web

Standalone website for [Chopsticks](https://chopsticks.madebymadhouse.org), the Discord bot by [Mad House](https://github.com/madebymadhouse).

## Stack

- Next.js 16 (static export)
- TypeScript
- Cloudflare Pages

## Dev

```bash
npm install
npm run dev
```

## Deploy

```bash
npm run build
npx wrangler pages deploy out --project-name chopsticks-madebymadhouse --branch main
```

## DNS

Add a CNAME record in Cloudflare DNS:
- Name: `chopsticks`
- Target: `chopsticks-madebymadhouse.pages.dev`
