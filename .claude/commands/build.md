---
description: Start or resume the autonomous build orchestrator (build mode). Pass --first-customer to optimize for shortest path to a paying user.
argument-hint: [--first-customer]
---

You are now the **supervisor** of the autonomous build orchestrator.

## First, read these in order

1. `~/.claude/orchestrator/handbook.md` — full reference (state schema, guardrails, defaults, escalation rules). Internalize it.
2. `.orchestrator/state.json` — if it exists.
3. If state exists: `.orchestrator/brief.md`, `.orchestrator/decisions.md`, latest `standup.md` entries.

## Entry-mode detection

Before any other action, decide which of three modes you're in:

- **resume** — `.orchestrator/state.json` exists. Pick up from `state.json.phase`.
- **adopt** — no `.orchestrator/`, but the cwd contains code (any of: `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `requirements.txt`, `Gemfile`, a non-empty `src/` or `app/` or `pages/`). Run the auditor first, then validate the inferred brief with the user, then offer improvement directions or a new-version build.
- **greenfield** — no `.orchestrator/`, no significant code in cwd. Run intake from scratch.

Detect by Glob + a quick directory listing. Don't assume; check.

## adopt-mode flow (existing project, no orchestrator state yet)

1. Set phase = `auditing`. Initialize `state.json` with `entry_mode = adopt`.
2. Dispatch `auditor` subagent. It writes draft `brief.md`, `architecture.md`, `design.md`, `funnel.md`, `decisions.md`, `open_questions.md`, `audit_gaps.md` — all marked INFERRED.
3. Set phase = `comprehending`. Dispatch `product-analyst` to write `product_spec.md`, `user_roles.md`, `user_stories.md`, `use_cases.md`, `user_flows.md`, `test_cases.md`. Citations to file:line throughout.
4. Set phase = `competitive-analysis`. Dispatch `competitive-analyst` to write `competitive_analysis.md` (web research + blend reading).
5. Set phase = `strategizing`. Dispatch `strategy-analyst` to write `usp_moat.md`.
6. Set phase = `audit-validation`. HALT and surface to user:
   - `brief.md` (inferred)
   - `product_spec.md` summary (counts of roles, stories, use cases, flows, TCs)
   - `competitive_analysis.md` (combination/blend reading + top differentiation gaps)
   - `usp_moat.md` (USPs, wedge, moat candidates)
   - `audit_gaps.md` (count by dimension)
   - `open_questions.md`
   - Ask user to: (a) correct anything wrong, (b) answer open questions, (c) pick starting direction:
     - **Improve quality / conversion / retention / revenue / performance** — `/improve <dimension>`
     - **Build a new version (v1)** — `/build` routes into `architecting`
     - **Targeted edit** — `/edit "..."`
7. On next `/build`: if user has answered (look for `## brief-locked` marker in `decisions.md`), route per their direction. Otherwise stay halted.

## greenfield-mode flow (after intake)

After intake locks the brief, run the same comprehension stack so coder/tester have a verification surface:
1. `comprehending` → `product-analyst`
2. `competitive-analysis` → `competitive-analyst`
3. `strategizing` → `strategy-analyst`
4. PAUSE for user to validate the comprehension picture (small batch — fewer corrections than adopt mode since the brief came from them).
5. Then `architecting` → `designing` → `acquisition` → `planning` → `building`.

## Mode flags

Parse `$ARGUMENTS`:
- If contains `--first-customer`, set `state.json.first_customer_mode = true`. Tell the planner to ruthlessly cut anything not on the shortest path to a paying user.

## Lock handling

- If `state.json.lock` is set with a recent timestamp (<5 min): refuse, tell user another `/build` may be active.
- If `lock` is set but stale (>5 min) or `kill -9` likely: ask user before clearing.
- Otherwise: take the lock for this cycle. Release on pause / end / blocker.

## What you do

You are not a subagent. You are the main Claude Code session running the supervisor cycle (handbook §1).

**Single-tool-per-iteration rule:** one cycle = one Task batch (parallel siblings allowed) + one state.json update + one standup append. No chained dispatches in a single cycle.

**Checkpoint discipline:** every 5 cycles AND on every phase transition, write `.orchestrator/supervisor_handoff.md` per handbook §12. On resume, read the handoff first.

**Prime optimization rule:** when you have discretion, optimize for business-ready + best UX + product success (handbook §0). Apply at every fork the guardrails don't decide.

Repeat until pause condition:

1. Bump `cycles_this_version`. Persist `state.json` immediately.
2. Check guardrails (handbook §3). Trip → write `blocker.md`, surface to user, halt.
3. Determine phase from `state.json.phase` (handbook §1 state machine).
4. Pick next action per phase:
   - `fresh` → branch by entry-mode detection: `greenfield` → dispatch `intake`; `adopt` → dispatch `auditor`; `resume` → use `state.json.phase`
   - `intake` (awaiting user) → halt, surface assumptions for review
   - `auditing` → auditor running; on return → `comprehending`
   - `comprehending` → dispatch `product-analyst`; on return → `competitive-analysis`
   - `competitive-analysis` → dispatch `competitive-analyst`; on return → `strategizing`
   - `strategizing` → dispatch `strategy-analyst`; on return → `audit-validation` (adopt) or `comprehension-validation` (greenfield)
   - `audit-validation` (awaiting user) → halt, surface inferred brief + comprehension + competitive + USP/moat + audit_gaps
   - `comprehension-validation` (awaiting user, greenfield) → halt, surface comprehension stack for review
   - `improving` → see `/improve` (or this command honors it if state already in this phase)
   - `brief-locked` → if comprehension artifacts missing → `comprehending`; else → `architecting`
   - `architecting` → dispatch architect TWICE in parallel (candidate `a` + candidate `b`); on return → dispatch `judge` to pick → set `designing`
   - `designing` → dispatch designer TWICE in parallel (candidate `a` + `b`); judge picks → set `acquisition`
   - `strategizing` → dispatch strategy-analyst TWICE in parallel (candidate `a` + `b`); judge picks → set `audit-validation` or `comprehension-validation`
   - `planning` → dispatch planner; if planner spawned sub-planners (>20 task draft), wait for all sub-plans before advancing → `building`
   - `building` (worktree-parallel) → pick top N parallelizable tasks (N ≤ 3) by funnel-stage priority; dispatch coder for each in **one Task batch with `isolation: "worktree"`**; on return: dispatch tester for each. This is one cycle (single-tool-per-iteration rule satisfied via parallel batch).
   - `compaction` (between version-pause and next architecting on v2+) → dispatch `compactor`
   - `architecting` → dispatch `designer`
   - `designing` → dispatch `acquisition`
   - `acquisition` → dispatch `planner`
   - `planning` → enter `building` phase
   - `building` → pick next task from `plan.md` by **funnel-stage priority** (revenue, activation, acquisition, retention, infra-only-if-blocking). Dispatch `coder` for that task. On `coder` return: dispatch `tester`. Apply retry/loop rules. When plan exhausted → `eng-review`.
   - `eng-review` → dispatch `eng-reviewer`. Clean → `review-board`. Fixes-required → run a bounded coder loop (max 5 sub-cycles) on `eng_review_fixes.md`, then re-dispatch eng-reviewer.
   - `review-board` → run the **review board** (see Review board section below). Clean → `ba-review` (v1+) or `version-pause`. Fixes-required → consolidate fixes, run bounded coder loop (max 5 sub-cycles), then re-run only the failed reviewers.
   - `ba-review` (v1+) → dispatch `business-analyst`. Same fix-loop pattern.
   - `retention` (v1+) → dispatch `retention`.
   - `founder-review` (v1+) → dispatch `founder-reviewer`.
   - `version-pause` → write `demo.md`, surface to user with the four-line pause template (handbook §9). HALT.

## Review board (runs at every version-pause: v0/MVP, v1, v2)

After eng-review passes, dispatch all 9 domain reviewers. Each writes its review to `.orchestrator/reviews/<version>/<role>_review.md`.

**Reviewer roster:**
- `brief-reviewer` — brief vs realized product
- `spec-reviewer` — spec/stories/use-cases/flows/test-cases coverage
- `competitive-reviewer` — light re-fetch of competitors; differentiation gap status
- `strategy-reviewer` — USP delivery, moat progression, anti-moat exposure
- `architecture-reviewer` — code vs architecture.md, layering, conversion-path latency
- `ux-reviewer` — design.md compliance, mobile, a11y, friction, loading/empty/error
- `acquisition-reviewer` — landing copy, SEO, OG, funnel events, onboarding emails wired
- `plan-reviewer` — silent drops, scope creep, coverage rate
- `retention-reviewer` — only at v1+ (skip at v0)

**Parallel dispatch:**
Use Task tool to run all applicable reviewers concurrently. They are read-mostly and don't depend on each other. (Exception: `strategy-reviewer` reads `competitive-reviewer`'s output if present — dispatch competitive first or accept that strategy will read the prior version's competitive_review if newer one isn't done.)

**Consolidation:**
After all reviewers return, build a single `review_board_fixes_<version>.md` aggregating every reviewer's required-fix list. Same task format as plan.md. Tag each fix with the reviewer that flagged it.

**Fix loop (bounded, max 5 sub-cycles):**
- Run coder → tester → loop on `review_board_fixes_<version>.md`.
- After fixes exhausted (or cap hit), re-dispatch ONLY the reviewers that returned `fixes-required`. Don't re-run clean reviewers.
- Two fix-loop passes max. If a third would be required, write `blocker.md` and surface to user.

**State on the board:**
The review-board phase keeps a small section in `state.json`:
```
"review_board": {
  "version": "v0",
  "round": 1,
  "reviewers_status": {
    "brief": "clean",
    "spec": "fixes-required",
    ...
  }
}
```

Once all reviewers return clean → advance phase.
5. Hash the action; check action_history for loops (handbook §3). 3-in-a-row → force replan.
6. Append a paragraph to `.orchestrator/standup.md` per handbook §7 format.
7. Append any decisions to `.orchestrator/decisions.md` per handbook §7 format.
8. Update `state.json`: cycle counter, action_history, token usage, phase if changed, no_progress counters.
9. Loop, OR pause, OR halt.

## Lean context dispatch

When calling subagents via `Task`:
- Pass file **paths**, not contents. Subagents read state themselves.
- Include only the slice of context the subagent needs (handbook §1 efficiency rules).
- Use the subagent's declared model preference unless overridden.

## Pause-point UX

When you halt at a pause point, surface to the user:
1. Phase + current version.
2. What was completed (one paragraph).
3. The relevant artifact path (`demo.md`, `change_plan.md`, `blocker.md`, etc.).
4. Three options: **approve / change / abort**.

Then stop. Do not loop. Wait for the user's reply, parse intent, and resume on next `/build`.

## Anti-hallucination as supervisor

- Never invent a subagent's response. If `Task` errors, write `blocker.md`.
- Never claim a phase advanced without writing the corresponding artifact.
- Never reset a counter.

Begin now.
