# Global Compatibility Plan — Chopsticks Discord Bot

_Last updated: 2025-07-15_
_Branch context: `feature/chopsticks/command-registry-audit`_

---

## 1. Context

The Chopsticks Discord bot exposes **75 slash commands** deployed globally to Discord guild
`1466336474176950285`. Phase 1 hardening (commit `0becf42`) completed two things:

- All 31 commands that carry a `userPerms` requirement now call
  `setDefaultMemberPermissions()` in their `SlashCommandBuilder` chain, closing the
  "anyone can see the command" disclosure gap.
- Every command file now exports a `meta` object that includes at minimum a `category`
  string, enabling automated registry audits.

In parallel, the bot ships a **prefix command system** (`src/prefix/registry.js`, 771 lines)
that mirrors the slash surface under the default prefix `!`. Per-guild prefixes can be
changed via `/prefix`. The prefix registry is hand-maintained and is **not auto-derived**
from `src/commands/`.

---

## 2. Slash / Prefix Parity Gaps

### Gap 1 — Registry Drift (high risk)

`src/prefix/registry.js` is a standalone, manually-maintained list. When a slash command
is added or modified in `src/commands/`, the prefix registry is not automatically updated.
Over time this leads to commands that exist only in one surface.

**Current state:** no tooling enforces parity; drift is caught only by manual QA.

### Gap 2 — Subcommand Ergonomics

Slash commands can expose a rich subcommand tree via `addSubcommand()` / `addSubcommandGroup()`.
Discord renders this as a guided picker UI. The prefix surface has no equivalent — subcommands
must be parsed from free-form text (e.g. `!ticket create`) with bespoke regex in each handler.
Any new subcommand added to a slash command requires matching hand-written prefix parsing.

### Gap 3 — Per-Option Autocomplete Absent from Prefix

Discord slash commands support `setAutocomplete(true)` on options; the bot's `autocomplete`
interaction handler feeds dynamic suggestions. The prefix path has no autocomplete at all —
users type raw values with no guidance, increasing error rates on commands with strict option
value sets (e.g. `/case` action types, `/warn` rule IDs).

### Gap 4 — Component-Dependent Commands Break in Prefix Context

Several commands rely on follow-up Discord components that are only valid in slash interaction
contexts:

| Command | Component type | Prefix-safe? |
|---|---|---|
| `/tickets` | Modal + buttons | ❌ |
| `/starboard` | Select menu | ❌ |
| `/reactionroles` | Buttons | ❌ |
| `/setup` | Paginated embeds + buttons | ❌ |

When invoked via prefix these commands either silently fail or throw unhandled errors because
`interaction.showModal()` is not available on a `Message` object.

### Gap 5 — Permission Check Divergence

Slash commands define required permissions via `setDefaultMemberPermissions()` (Discord
enforces at the API level) **and** via `meta.userPerms` (bot-level re-check in the
interaction handler). The prefix registry contains its own inline permission checks per
command, written independently of `meta.userPerms`. These checks can diverge: a permission
added to `meta.userPerms` for a slash command will not automatically be enforced on the
prefix equivalent.

### Gap 6 — Rate Limit Key Isolation (informational)

Prefix invocations use `source: "prefix"` as a secondary key in the rate-limit lookup
(`src/index.js` → `getRateLimitForCommand`). Confirmed: the same per-command limit
thresholds apply regardless of source — prefix and slash share the same bucket values.
**No action required**, but this must be re-verified whenever rate-limit logic changes.

---

## 3. Permission Gate Consistency

### Current state (post-Phase 1)

| Layer | Mechanism | Status |
|---|---|---|
| Discord API | `setDefaultMemberPermissions()` | ✅ done for all 31 commands with `userPerms` |
| Bot interaction handler | `meta.userPerms` check | ✅ present |
| Prefix handler | Inline per-command checks | ⚠️ manually coded, may diverge |

### Proposed single source of truth

Create `src/prefix/applyMetaPerms.js`:

```
// Pseudocode — planning only
export function applyMetaPerms(commandMeta, message) {
  for (const perm of commandMeta.userPerms ?? []) {
    if (!message.member.permissions.has(perm)) {
      return { allowed: false, missing: perm };
    }
  }
  return { allowed: true };
}
```

`src/prefix/registry.js` would import this helper and replace each bespoke permission block
with a single `applyMetaPerms(meta, message)` call. The `meta` object is imported from the
same command file already used by the slash handler — one place to update permissions, both
surfaces stay in sync.

---

## 4. One-Time Deploy Strategy

Applies after any command schema change (adding/removing options, renaming commands or
subcommands, changing `setDefaultMemberPermissions` values).

**Branch:** `feature/chopsticks/command-registry-audit`

**Deploy window:** Tuesday and Thursday, **02:00–04:00 UTC** (historically lowest command
invocation volume per Prometheus `discord_commands_total` metric).

### Deploy steps

1. Merge PR to `main`.
2. Pull on the host: `git pull origin main && npm install`.
3. Run `node scripts/deployCommands.js` — pushes updated command schemas to Discord.
4. Wait for Discord's command propagation (~5 min for global commands).
5. Monitor `discord-errors` Prometheus metric for **30 minutes**:
   - Expected baseline: <0.5% error rate.
   - Warning threshold: >2% → investigate.
   - Rollback threshold: >5% → execute rollback immediately.
6. Check `#bot-logs` channel for `MISSING_PERMISSIONS` or `UNKNOWN_COMMAND` error strings.
7. If all clear, close the deploy window ticket.

### Rollback procedure

```bash
git revert HEAD~1
npm install
node scripts/deployCommands.js
```

For an emergency hard rollback (schema incompatibility):

```bash
node scripts/clearCommands.js          # wipes all registered slash commands
git checkout <last-known-good-sha>
npm install
node scripts/deployCommands.js         # re-registers commands from previous schema
```

> **Note:** `clearCommands.js` causes a ~1 hour window where all slash commands are
> invisible to users. Use only as a last resort.

---

## 5. Acceptance Checklist for Code Agent PRs

Any PR that creates or modifies a file under `src/commands/` or `src/prefix/` MUST satisfy
all of the following before merge:

- [ ] **Registry audit test passes:** `test/unit/command-registry-audit.test.js` — every
  command with a non-empty `meta.userPerms` must have `setDefaultMemberPermissions` set in
  its `data` builder.
- [ ] **Deploy dry-run succeeds:** `node scripts/deployCommands.js --dry-run` runs in CI
  (or against a staging guild) without errors.
- [ ] **Prefix parity check:** if a new slash command is added, either (a) a corresponding
  entry is added to `src/prefix/registry.js`, or (b) the command is explicitly marked
  `prefixDisabled: true` in its `meta` with a justification comment.
- [ ] **`meta` completeness:** no new `export const data` block without a matching
  `export const meta` that includes at minimum `{ category, description }`. The registry
  audit test enforces this.
- [ ] **Prefix parity test passes:** `test/unit/prefix-parity.test.js` — for every command
  in the prefix registry, its permission set matches `meta.userPerms` from the corresponding
  slash command file.
- [ ] **No regression in existing tests:** `npm test` green on `main` before and after the
  PR branch.

---

## 6. Implementation Prompt (Code Agent)

### Prompt A — Prefix Parity Bridge

**PR Title:** `feat: prefix parity bridge — auto-derive prefix perms from meta.userPerms`

**Branch:** `feature/chopsticks/prefix-parity-bridge`

**Objective:** Eliminate the permission divergence gap (Gap 5) by replacing all inline
permission checks in `src/prefix/registry.js` with a shared utility that reads
`meta.userPerms` from each command's export.

**Files to create:**
- `src/prefix/applyMetaPerms.js` — utility function that accepts a `meta` object and a
  `Discord.js Message` member, iterates `meta.userPerms`, and returns `{ allowed, missing }`.

**Files to modify:**
- `src/prefix/registry.js` — import `applyMetaPerms`; for each command block that currently
  has a manual `member.permissions.has(...)` check, replace it with a single
  `applyMetaPerms(meta, message)` call.

**Tests to add:**
- `test/unit/prefix-parity.test.js` — for each entry in the prefix registry, assert that:
  1. A corresponding command file exists under `src/commands/`.
  2. The command file exports `meta.userPerms`.
  3. The prefix handler does not define additional or fewer permissions than `meta.userPerms`.

**Acceptance criteria:**
- [ ] `npm test` passes (including new prefix-parity test).
- [ ] No prefix command can be invoked by a user who would be blocked by the slash version.
- [ ] CI pipeline green.
- [ ] PR description includes a table mapping each changed command to its `userPerms` value.

---

### Prompt B — Prefix Registry Sync Guard

**PR Title:** `ci: add prefix-registry sync check to prevent drift`

**Branch:** `feature/chopsticks/prefix-registry-sync-guard`

**Objective:** Prevent Gap 1 (registry drift) by adding a CI check that fails if a slash
command exists without a corresponding prefix registry entry (unless explicitly opted out
with `meta.prefixDisabled = true`).

**Files to create:**
- `scripts/checkPrefixSync.js` — reads all files from `src/commands/**/*.js`, extracts
  command names, then cross-references against `src/prefix/registry.js` entries. Exits
  non-zero if any slash command name is absent from the prefix registry and not marked
  `prefixDisabled`.
- `test/unit/prefix-sync.test.js` — unit test wrapper around the sync check logic.

**Files to modify:**
- `.github/workflows/ci.yml` (or equivalent) — add a step that runs
  `node scripts/checkPrefixSync.js` on every PR targeting `main`.

**Acceptance criteria:**
- [ ] CI fails on a branch where a new slash command is added without a prefix registry entry.
- [ ] CI passes when `meta.prefixDisabled = true` is set.
- [ ] `npm test` passes.
