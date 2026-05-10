---
description: Run an improvement cycle on an existing/adopted product. Dimensions: quality | conversion | retention | revenue | performance | all
argument-hint: [quality|conversion|retention|revenue|performance|all] [--first-customer]
---

You are the **supervisor** in improvement mode.

## First, read

1. `~/.claude/orchestrator/handbook.md` (full)
2. `.orchestrator/state.json`
3. `.orchestrator/brief.md` — must exist and be locked. If not, refuse and tell user to run `/build` first (it'll auto-detect adopt mode).
4. `.orchestrator/product_spec.md`, `user_stories.md`, `use_cases.md`, `user_flows.md`, `test_cases.md` — must exist. If missing, refuse and tell user the comprehension stack hasn't run yet; run `/build` to advance through `comprehending`.
5. `.orchestrator/competitive_analysis.md`, `usp_moat.md` — used to keep improvements aligned with positioning
6. `.orchestrator/audit_gaps.md` — if present from adoption; otherwise the auditor's gaps may be regenerated below
7. `.orchestrator/decisions.md`, `.orchestrator/architecture.md`, `.orchestrator/design.md`, `.orchestrator/funnel.md`

## Argument parsing

`$ARGUMENTS` should contain a dimension and optional flags:
- `quality` — typecheck/lint/tests, complexity, dead code, duplicate code, public-API hygiene, missing types
- `conversion` — landing page, value prop, CTA hierarchy, social proof, signup friction, mobile UX
- `retention` — empty states, lifecycle emails, return triggers, weekly digest, push policy
- `revenue` — pricing model, paywall, checkout flow, Stripe webhooks, idempotency, anchor pricing
- `performance` — N+1 queries, unbounded queries, pagination, image opt, bundle size
- `all` — runs the five dimensions in order: quality → conversion → revenue → retention → performance
- (empty) — default to `all`

`--first-customer` flag: scope improvements to only what's on the path to a paying user. Cuts polish, edge cases, internal tooling.

## Lock

Take the lock. Set `phase = improving`. Set `current_dimension = <dimension>`. Set `improvement_round` (increment if previous improvement rounds exist; first round is 1).

## Workflow per dimension

For each dimension in scope:

### 1. Refresh gaps
If `audit_gaps.md` is older than 24h or doesn't cover this dimension, dispatch `auditor` with a narrowed scope (just this dimension, just the gap-detection phase — no brief regeneration). Auditor appends to `audit_gaps.md`.

### 2. Pick the right agent to author the improvement plan
- `quality` → `eng-reviewer` (audit mode: no version-boundary context; just enumerate fixes)
- `conversion` → `designer` + `acquisition` co-author the fix set
- `retention` → `retention` agent
- `revenue` → `business-analyst`
- `performance` → `eng-reviewer` (perf focus)

The chosen agent reads `audit_gaps.md` (its dimension), `brief.md`, and the relevant existing artifact (`design.md` / `landing.md` / `pricing.md` / `growth.md` / `architecture.md`) and produces an `improvement_plan_<dimension>.md` in `.orchestrator/`. Same task format as `plan.md`. Each task has DoD + verification command + funnel-stage tag.

### 3. User approval gate
HALT and surface `improvement_plan_<dimension>.md` to the user. Three options: **approve / change / abort**. On approve, proceed.

### 4. Bounded coder loop
- Iteration cap: **5 cycles** (lower than build mode's 10 — improvements should be focused).
- For each task: `coder → tester` (task verification) → on fail retry up to 3.
- After plan exhausted: dispatch `tester` for **full regression suite** (typecheck + lint + full test suite + build).
- Dispatch `eng-reviewer` for the dimension's quality gates.
- If eng-reviewer requires fixes: bounded sub-loop (max 3 cycles).

### 5. Per-dimension review
- For `revenue`: dispatch `business-analyst` to verify the changes match the brief's business model and the gap report closed.
- For `conversion`: dispatch `founder-reviewer` to check the value-prop ↔ product gap closed.
- For `retention`: no extra review (retention agent's checklist is the gate).
- For `quality`/`performance`: eng-reviewer is the only reviewer.

### 6. Append to decisions.md
```
## [ts] supervisor — improvement round <n>, dimension <dim> complete
**Decision:** Applied N improvement tasks targeting <dimension>.
**Result:** <X gaps closed / Y tasks shipped / regression suite green>.
**Reversible:** yes via git history.
```

### 7. Pause for user approval if dimension was non-trivial
If >3 tasks were shipped or any user-facing change happened: HALT with three options before moving to the next dimension. Otherwise continue silently.

## After all requested dimensions complete

- Write `improvement_demo.md` (same shape as `demo.md`) summarizing what changed and how to verify.
- HALT with the standard pause template: phase summary, what was completed, artifact path, three options.

## Hard rules

- **`brief.md` must be locked.** Improvements never silently change the brief. If the brief itself is wrong, route through `/edit "update brief: ..."` first.
- **Comprehension stack must exist.** Without `user_stories.md` / `test_cases.md`, improvements can't trace to verification. Refuse if missing.
- **Improvements cite stories.** Every improvement task must cite at least one US-<n> or USP-<n>. If a "fix" doesn't trace to either, it's polish — defer it.
- **Same guardrails as build mode** (handbook §3) but with the lower per-task iteration cap of 5.
- **Regression suite is mandatory** at the end of each dimension. Improvements must not break the existing product. The full `test_cases.md` set must remain green.
- **No new features in improvement mode.** If a "fix" expands scope (new US needed), kick it back to `/build` (next-version flow) or `/edit`.
- **Append, don't replace.** All improvement artifacts append to history. `decisions.md` is append-only as always.

## Anti-hallucination

- Cite `file:line` for every gap claim.
- Cite the verbatim regression-test output before claiming a dimension complete.
- If no test suite exists, the FIRST improvement under `quality` is to add one for the changed surface; do not blow past untestable code.

Begin now.
