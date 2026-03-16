# Chopsticks Project Context

> **Note for agents**: The `~/chopsticks` directory is root-owned server infrastructure and cannot be
> written to without elevated privileges. This context file lives in `~/main/chopsticks-context/` as a
> reference. When `~/chopsticks` becomes writable, copy this file to `~/chopsticks/PROJECT_CONTEXT.md`.

---

## What Chopsticks Is

Chopsticks is a production-grade Discord bot maintained primarily by **goot27**, a core contributor to the WokSpec ecosystem.

It is a **contributor project** — not a core platform system. It should be respected as independent work while acknowledging its ecosystem affiliation.

## Purpose

Chopsticks serves the **Egg Fried Rice** Discord community and potentially other servers.

Its primary capabilities include:

- **Music playback**: Powered by Lavalink, an audio delivery server for Discord bots.
- **Server management**: Utility and moderation commands for Discord servers.
- **Operational monitoring**: Grafana dashboards + Prometheus metrics provide observability into bot health and performance.
- **Reverse proxy**: Caddy handles HTTPS and routing for the bot's web-facing surfaces.

## Repository Structure

The local `~/chopsticks` directory contains **deployment infrastructure**, not bot source code:

```
~/chopsticks/
├── Caddyfile          — Caddy reverse proxy configuration
├── lavalink/
│   ├── application.yml — Lavalink audio server configuration
│   └── plugins/       — Lavalink plugin extensions
└── monitoring/
    ├── prometheus.yml  — Prometheus scrape configuration
    ├── alerts/         — Alerting rules
    └── grafana/        — Grafana dashboard provisioning
```

The **bot source code** lives in goot27's GitHub repository and is maintained separately from this workspace.

## Ecosystem Role

Chopsticks sits at the edge of the WokSpec ecosystem:

- It is **affiliated** with the ecosystem through goot27's contributor relationship.
- It is **not integrated** with Orinadus, Nqita, Autiladus, or WokStudio at the infrastructure level.
- It may experiment with ideas from the ecosystem, but remains a standalone product.
- The Egg Fried Rice community may act as an informal user community for ecosystem projects.

## Ownership and Maintenance

- **Maintainer**: goot27
- **GitHub**: github.com/goot27
- **Community**: Egg Fried Rice Discord (`discord.gg/B7Bhuherkn`)
- **Architecture decisions**: Deferred to goot27.

## Relationship to Other Systems

Chopsticks is independent of the core platform systems:

- It does **not** depend on WokAPI for auth/billing.
- It does **not** use Autiladus for orchestration.
- It does **not** publish to WokHei or Orinadus.
- It **may** share community space and contributor context with the broader ecosystem.
