# Voice Model Selection — Scoped Plan

Scope: narrow, implementation-ready plan for voice agent model selection and per-guild configuration.

Goal: Default behavior must be free for Mad House (no paid LLM calls); admins may link their own API keys to enable paid providers. For now, the default must produce empty LLM outputs until an admin enables a provider via `/model`.

Key decisions:
- Default provider: `none` (no LLM output)
- Free model options: `ollama-local` (user-hosted; optional)
- Paid providers: `anthropic` (Claude), `openai` (OpenAI) — only via user-supplied API keys
- Storage: store encrypted API keys in `guild_settings.voice` encrypted with AGENT_TOKEN_KEY

Acceptance Criteria:
- Voice requests return empty text when provider is `none`.
- `/model set|get|link|unset` implemented and restricted to Manage Guild permissions.
- Token link flow validates token before persisting.

Implementation steps (atomic): DB schema → encryption helpers → /model command → voice-llm behavior → tests → runbook.

Deliverables:
- README.md (this file)
- manifest.json (machine-readable task description)
- Runbook (admin-facing steps)

