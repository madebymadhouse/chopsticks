# Chopsticks Agent Rules

> **Note for agents**: This file belongs in `~/chopsticks/AGENT_RULES.md`.
> Currently stored in `~/main/chopsticks-context/` because `~/chopsticks` is root-owned.

---

## Before Making Any Changes

1. Confirm with goot27 before modifying anything in the Chopsticks deployment or source code.
2. Read `PROJECT_CONTEXT.md` to understand what Chopsticks is and what it is not.
3. Treat this as an independent contributor project. Do not apply WokSpec ecosystem conventions without goot27's confirmation.

## Infrastructure Rules

The `~/chopsticks` directory is **deployment infrastructure**, not bot source code.

- `Caddyfile` — Only modify if goot27 has requested a routing or TLS change.
- `lavalink/application.yml` — Only modify if a Lavalink version or plugin change is required.
- `monitoring/` — Only modify if alerting rules or dashboard configuration has been explicitly requested.

Do **not** restart services, modify Caddy routes, or change Lavalink configuration without confirmation.

## Source Code Rules

The Chopsticks bot source code lives in goot27's GitHub repository. Agents should:

- Not assume bot logic is present in `~/chopsticks`.
- Not make code changes to the bot without goot27's direction.
- Not merge Chopsticks source code with other ecosystem repositories.

## Ecosystem Integration Rules

- Do not couple Chopsticks to WokAPI, Autiladus, or Nqita infrastructure.
- Do not promote Chopsticks into a core platform system without explicit architectural documentation.
- Do not reorganize `~/chopsticks` as part of a broader ecosystem architecture pass — it is intentionally separate.

## Monitoring and Observability

Grafana/Prometheus are configured for observability of the Chopsticks deployment. If monitoring shows issues:

1. Report findings to goot27 before taking action.
2. Do not modify alert thresholds or dashboard provisioning without direction.

## What Agents May Do Safely

- Read and analyze configuration files.
- Document findings in context files.
- Propose infrastructure improvements as suggestions (not changes).
- Assist goot27 when he explicitly requests help.
