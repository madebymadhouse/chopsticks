# Phase 9 — Observability & Prometheus Alert Rules

> **Document type:** Planning / Specification  
> **Status:** Draft  
> **Last updated:** 2025  
> **Prometheus config target:** `prometheus.yml` (alerting rules block)  
> **Runbook base path:** `runbooks/chopsticks/incident_runbook.md`

---

## Overview

This document defines six new Prometheus alert rules to cover the new features introduced in Phase 7 and Phase 8. Each rule is provided as ready-to-copy YAML, followed by a description of the intended behavior, thresholds, and a runbook link.

All rules should be added to a dedicated rule file at:
```
monitoring/rules/chopsticks_new_features.yml
```

---

## Alert Rules YAML

```yaml
# monitoring/rules/chopsticks_new_features.yml
groups:
  - name: chopsticks_new_features
    rules:

      # ──────────────────────────────────────────────────────────────────────
      # 1. AI Rate Limit Spike
      # ──────────────────────────────────────────────────────────────────────
      - alert: ChopsticksAIRateLimitSpike
        expr: |
          sum(increase(chopsticks_rate_limit_hits_total{bucket="ai"}[5m])) > 50
        for: 0m
        labels:
          severity: warning
          service: chopsticks
          feature: ai
        annotations:
          summary: "High volume of AI rate-limit rejections"
          description: >
            More than 50 AI rate-limit hits have occurred in the last 5 minutes
            (current value: {{ $value }}). This may indicate a runaway command
            loop, abusive usage, or an under-configured rate-limit threshold.
          runbook: "runbooks/chopsticks/incident_runbook.md#p2-rate-limit-alerts-firing"

      # ──────────────────────────────────────────────────────────────────────
      # 2. Voice LLM Failure Rate
      # ──────────────────────────────────────────────────────────────────────
      - alert: ChopsticksVoiceLLMHighFailureRate
        expr: |
          (
            sum(rate(chopsticks_voice_llm_calls_total{status="error"}[5m]))
            /
            sum(rate(chopsticks_voice_llm_calls_total[5m]))
          ) > 0.10
        for: 2m
        labels:
          severity: critical
          service: chopsticks
          feature: voice_llm
        annotations:
          summary: "Voice LLM failure rate exceeds 10%"
          description: >
            More than 10% of voice LLM calls have failed over the last 5 minutes
            (current rate: {{ $value | humanizePercentage }}). Users in voice
            channels will be experiencing degraded AI features.
          runbook: "runbooks/chopsticks/incident_runbook.md#p2-voicelavalink-down"

      # ──────────────────────────────────────────────────────────────────────
      # 3. Playlist Upload Queue Depth
      # ──────────────────────────────────────────────────────────────────────
      - alert: ChopsticksPlaylistUploadQueueDepth
        expr: |
          chopsticks_playlist_ingest_queue_depth > 20
        for: 5m
        labels:
          severity: warning
          service: chopsticks
          feature: music
        annotations:
          summary: "Playlist upload ingest queue depth exceeds 20"
          description: >
            The playlist ingest queue has {{ $value }} pending jobs and has
            remained above 20 for more than 5 minutes. This may indicate the
            ingest worker has stalled or Lavalink is unavailable.
          runbook: "runbooks/chopsticks/incident_runbook.md#p2-voicelavalink-down"

      # ──────────────────────────────────────────────────────────────────────
      # 4. Command Error Spike
      # ──────────────────────────────────────────────────────────────────────
      - alert: ChopsticksCommandErrorSpike
        expr: |
          (
            sum by (command) (rate(chopsticks_command_errors_total[10m]))
            /
            sum by (command) (rate(chopsticks_command_invocations_total[10m]))
          ) > 0.05
        for: 3m
        labels:
          severity: warning
          service: chopsticks
          feature: commands
        annotations:
          summary: "Command {{ $labels.command }} error rate exceeds 5%"
          description: >
            The command /{{ $labels.command }} has an error rate of
            {{ $value | humanizePercentage }} over the last 10 minutes, which
            exceeds the 5% threshold. Users may be seeing error embeds or
            unhandled exceptions.
          runbook: "runbooks/chopsticks/incident_runbook.md#p2-commands-returning-errors"

      # ──────────────────────────────────────────────────────────────────────
      # 5. Redis Connection Loss
      # ──────────────────────────────────────────────────────────────────────
      - alert: ChopsticksRedisConnectionLoss
        expr: |
          chopsticks_redis_health_check_ok == 0
        for: 30s
        labels:
          severity: critical
          service: chopsticks
          feature: redis
        annotations:
          summary: "Redis health check has been failing for >30s"
          description: >
            The Chopsticks bot Redis health check has returned unhealthy for
            more than 30 seconds. Rate limiting, session caching, and queue
            snapshots are degraded or unavailable. Immediate investigation required.
          runbook: "runbooks/chopsticks/incident_runbook.md#p2-redis-unavailable"

      # ──────────────────────────────────────────────────────────────────────
      # 6. New Command Zero Adoption
      # ──────────────────────────────────────────────────────────────────────
      - alert: ChopsticksNewCommandZeroAdoption
        expr: |
          (
            sum by (command) (
              increase(chopsticks_command_invocations_total{command=~"massban|lockdown|antispam_set|note|history|ai_summarize|ai_translate|ai_moderate|ai_persona_set|ai_stats|auction_create|trade|heist|casino_slots|streak|birthday_set|birthday_list|events_create|suggest|reputation_give|music_shuffle|music_save|music_playlist_load|music_eq|music_lyrics|embed_create|schedule|tag|pin|convert"}[7d])
            )
          ) == 0
        for: 0m
        labels:
          severity: info
          service: chopsticks
          feature: adoption
        annotations:
          summary: "New command /{{ $labels.command }} has 0 invocations after 7 days"
          description: >
            The command /{{ $labels.command }} has not been invoked once in the
            7 days since it was deployed. This may indicate the command is
            undiscoverable, broken on deploy, or not relevant to the server.
            Consider reviewing /help visibility or adding an onboarding prompt.
          runbook: "runbooks/chopsticks/incident_runbook.md#p2-commands-returning-errors"
```

---

## Alert Details

### Alert 1: `ChopsticksAIRateLimitSpike`

**Metric used:** `chopsticks_rate_limit_hits_total{bucket="ai"}`  
**Expression:** sum of increases over 5-min window > 50  
**Fires immediately** (`for: 0m`) because a burst of 50 hits in 5 minutes is an actionable signal even in a single window.  
**Severity:** `warning`  
**Expected baseline:** < 5 AI rate-limit hits per 5 minutes under normal usage.  
**Runbook:** `incident_runbook.md#p2-rate-limit-alerts-firing`

---

### Alert 2: `ChopsticksVoiceLLMHighFailureRate`

**Metric used:** `chopsticks_voice_llm_calls_total` with `status` label (`ok` / `error`)  
**Expression:** error rate > 10 % over 5-min window, sustained for 2 min  
**Severity:** `critical` — voice LLM failure directly degrades users in active voice sessions.  
**Expected baseline:** < 0.5 % failure rate under normal conditions.  
**Runbook:** `incident_runbook.md#p2-voicelavalink-down`

---

### Alert 3: `ChopsticksPlaylistUploadQueueDepth`

**Metric used:** `chopsticks_playlist_ingest_queue_depth` (gauge)  
**Expression:** gauge > 20 sustained for 5 min  
**Severity:** `warning`  
**Expected baseline:** queue depth < 5 at peak; should drain within seconds under normal conditions.  
**Runbook:** `incident_runbook.md#p2-voicelavalink-down`

---

### Alert 4: `ChopsticksCommandErrorSpike`

**Metric used:** `chopsticks_command_errors_total` and `chopsticks_command_invocations_total`  
**Expression:** per-command error rate > 5 % over 10-min window, sustained for 3 min  
**Severity:** `warning`  
**Note:** `by (command)` label produces one alert per misbehaving command, preventing alert storms from masking root cause.  
**Expected baseline:** < 0.1 % error rate per command.  
**Runbook:** `incident_runbook.md#p2-commands-returning-errors`

---

### Alert 5: `ChopsticksRedisConnectionLoss`

**Metric used:** `chopsticks_redis_health_check_ok` (gauge: 1 = healthy, 0 = unhealthy)  
**Expression:** gauge == 0 for > 30 s  
**Severity:** `critical`  
**Immediate impact:** Rate limiting falls back to in-memory (does not share state across shards), queue shuffle undo snapshots lost, session caching unavailable.  
**Runbook:** `incident_runbook.md#p2-redis-unavailable`

---

### Alert 6: `ChopsticksNewCommandZeroAdoption`

**Metric used:** `chopsticks_command_invocations_total` (filtered to 30 new command names)  
**Expression:** 7-day increase == 0 (info-level; fires once per command with zero invocations)  
**Severity:** `info` — not a production incident, but actionable for the product team.  
**Note:** The regex in the `command` label matcher must match the metric label values exactly. Update the regex when new commands are added or renamed.  
**Runbook:** `incident_runbook.md#p2-commands-returning-errors`

---

## Required Metric Instrumentation

The following metrics must be emitted by the bot for the above alerts to function. Add these to `src/metrics.js` if not already present:

| Metric Name | Type | Labels | Description |
|---|---|---|---|
| `chopsticks_rate_limit_hits_total` | Counter | `bucket`, `guild_id` | Incremented each time a request is rate-limited |
| `chopsticks_voice_llm_calls_total` | Counter | `status` (`ok`/`error`) | Incremented for each voice LLM API call |
| `chopsticks_playlist_ingest_queue_depth` | Gauge | — | Current depth of the playlist ingest queue |
| `chopsticks_command_errors_total` | Counter | `command` | Incremented on each unhandled command error |
| `chopsticks_command_invocations_total` | Counter | `command` | Incremented on each command invocation |
| `chopsticks_redis_health_check_ok` | Gauge | — | 1 if Redis healthy, 0 if unhealthy (set by health-check loop) |

---

## Grafana Dashboard Additions

Once the above metrics are instrumented and alerts are active, add the following panels to the **Chopsticks — Operations** Grafana dashboard:

1. **AI Rate Limit Hits** — time-series of `chopsticks_rate_limit_hits_total{bucket="ai"}` over time
2. **Voice LLM Failure Rate** — gauge panel showing current error percentage
3. **Playlist Queue Depth** — stat panel with threshold coloring (green < 10, yellow 10-20, red > 20)
4. **Command Error Rate Heatmap** — heatmap of error rates by command name over time
5. **Redis Health** — status panel: green = 1, red = 0
6. **New Command Adoption** — bar chart of 7-day invocation counts for all 30 new commands
