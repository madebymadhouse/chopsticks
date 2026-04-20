# Runbook: Voice Model Selection — Admin Guide

Purpose
- Guide server admins through linking their own LLM provider keys (Anthropic/Claude, OpenAI) and enabling voice LLM for their server.

Prerequisites
- Server admin privileges (Manage Guild)
- Access to server dashboard or ability to run bot commands
- If using local Ollama, the administrator must host Ollama and confirm `OLLAMA_URL` is reachable from the bot host.

Daily Operations
- To enable a provider:
  1. Run `/model set anthropic` (ephemeral reply explains next steps).
  2. Open dashboard link or respond to the modal `/model link` and paste your API key.
  3. Bot validates key by calling a single health/generate endpoint (non-billing short call).
  4. If validation succeeds, token encrypted and stored; provider status flips to `configured`.

- To disable provider:
  1. Run `/model unset` — removes stored token and sets provider to `none`.

Token Rotation
- To rotate tokens, use `/model link` with new key; old key is securely deleted after new key validated.

Security & Privacy
- Tokens are encrypted at rest using AGENT_TOKEN_KEY; ensure AGENT_TOKEN_KEY is rotated via documented admin process.
- Do NOT paste tokens into public channels. The `/model link` flow opens an ephemeral secure modal or dashboard link.

Troubleshooting
- Validation failed: ensure API key is correct and has access to the requested model.
- Ollama unreachable: check network and that Ollama container is running and has the model installed.

Rollback
- If enabling provider causes errors, run `/model unset` to remove key and return to default free behavior (empty responses).

Contact
- For help, contact repo maintainers or open an issue with logs and correlation IDs.

