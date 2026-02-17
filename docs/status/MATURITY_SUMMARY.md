# Maturity Model - Quick Reference

## Current Status: Level 1 (Invariants Locked) - In Progress

**LEVEL 0 COMPLETE ✅** (2026-02-14)

### What This Means

You have achieved baseline stability. The platform boots cleanly and reliably.

**Now beginning Level 1:** Freeze core contracts before adding features.

### Quick Commands

```bash
# Start the platform
make start

# Check health
make health

# Run Level 0 verification (should pass)
make test-level-0

# View full maturity model
cat MATURITY.md
```

### Level 0 Achievements ✅

1. ✅ Music interaction fix deployed
2. ✅ Permission enforcement deployed  
3. ✅ Created maturity tracking (MATURITY.md)
4. ✅ Created unified startup (`make start`)
5. ✅ All Level 0 exit criteria verified
6. ✅ Automated Level 0 check passes
7. ✅ Level 0 marked complete

### Level 1 Priorities (Current)

1. 🔴 Add protocol versioning to agent messages
2. 🔴 Implement 49-agent per guild limit
3. 🔴 Create migration framework
4. 🔴 Freeze schema with hash verification
5. 🔴 Write contract tests for core flows

### Level 1 Exit Criteria (Quick View)

- 🔲 Agent pool schema frozen
- 🔲 Controller↔agent protocol versioned
- 🔲 Deployment limits (49 agents/guild) enforced
- 🔲 Backward-compatible migrations only
- 🔲 Contract tests for pools/registration/deployment/teardown

### Rules

1. **Do NOT advance** to Level 2 until ALL Level 1 criteria pass
2. **Do NOT merge** PRs that break Level 0 or Level 1 criteria
3. **Do NOT add features** until platform is stable (Level 7+)

### If Something Breaks

1. Check which level regressed
2. Mark that level as 🔴 REGRESSED in MATURITY.md
3. Stop all work at higher levels
4. Fix the regression
5. Re-run all checks for that level

### Test Status

```bash
$ make test-level-0
✅ PASSED - Level 0 baseline maintained
```

(Level 1 tests coming soon)

---

**Remember:** Progress is measured by what's mechanically enforced, not what feels stable.

For full details, see [MATURITY.md](./MATURITY.md)
