# Chopsticks Web

Standalone website for [Chopsticks](https://chopsticks.wokspec.org), the Discord bot by [Wok Specialists](https://wokspec.org).

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
npx wrangler pages deploy out --project-name chopsticks-wokspec --branch main
```

## DNS

Add a CNAME record in Cloudflare DNS:
- Name: `chopsticks`
- Target: `chopsticks-wokspec.pages.dev`
