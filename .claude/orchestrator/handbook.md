# Orchestrator Handbook

The single reference for the supervisor and every subagent. Read this first.

---

## 0. Prime optimization rule

**When an agent has discretion, pick the option that maximizes: business-ready + best UX + product success.**

This is the tie-breaker across the entire orchestrator. Used at every fork that hard guardrails don't already decide.

- **Business-ready** = a real user could pay or onboard today; legal/security/payment/auth basics in place
- **Best UX** = mobile-first, conversion checklist passes, no missing loading/empty/error states, signup friction minimized, copy that converts
- **Product success** = does this move the wedge / USP / moat or just the codebase?

This rule does NOT override:
- Hard guardrails (max iterations, append-only, no-delete, regression tests)
- Story coverage requirements
- Decision-log compliance

It DOES override:
- Author preference / internal elegance
- Refactor cleanliness for its own sake
- "Technically fine" options that don't move the needle

Every producer and reviewer agent applies this rule when comparing options. The supervisor cites it when escalating ambiguous choices.

## 1. The supervisor

The supervisor is **the body of the `/build` slash command**, run by the main Claude Code session. It is not a subagent. It dispatches subagents via the `Task` tool, reads/writes `.orchestrator/` state, and enforces guardrails.

### Supervisor cycle (one iteration — single-tool-per-iteration rule)

**One cycle = one Task batch + one state update + one standup append.** This is non-negotiable. Multiple parallel Task dispatches in a single batch count as one cycle (parallel sibling tasks are fine; sequential chained dispatches in one cycle are not).

1. **Load state.** Read `.orchestrator/state.json` and (if newer than state) `.orchestrator/supervisor_handoff.md`. If state missing, treat as fresh project.
2. **Bump cycle counter.** Persist immediately.
3. **Check guardrails.** If any tripped → write `blocker.md`, surface to user, halt.
4. **Determine phase.** See state machine.
5. **Pick next action.** Per the phase state machine.
6. **Detect loop.** Hash the action (`agent_name + truncated input`). If same hash appears 3 times in a row in `state.json.action_history` → force replan. (The `post-task.js` hook also enforces this deterministically.)
7. **Dispatch.** Call subagent(s) via `Task`. Pass file paths, not file contents. Use `isolation: "worktree"` for parallelizable tasks (see §11).
8. **Record result.** Append one paragraph to `standup.md`. Append any decisions to `decisions.md`. Update `state.json` (counters, action_history, phase if changed). Append a handoff entry if the phase advanced.
9. **Checkpoint.** Every 5 cycles, OR on any phase transition, write `supervisor_handoff.md` (see §12).
10. **Loop or pause.** Continue if not at a pause point; otherwise surface to user.

### State machine (build mode)

```
fresh → entry-mode detection
  greenfield: → intake → (user reviews assumptions) → brief-locked
                       → comprehending → competitive-analysis → strategizing
                       → comprehension-validation (user reviews) → ready
  adopt:      → auditing → comprehending → competitive-analysis → strategizing
                       → audit-validation (user reviews everything inferred)
                       → ready (user picks: improve | new version | edit)
  resume:     → use state.json.phase
ready → architecting → designing → acquisition → planning → building
building → (per task: coder → tester → loop)
building → (plan exhausted) → eng-review (story coverage gate)
eng-review → (fixes needed) → building (bounded)
eng-review → (clean) → review-board (9 reviewers in parallel)
review-board → (fixes needed) → bounded coder loop → re-run failed reviewers (max 2 fix passes)
review-board → (clean) → ba-review (v1+) → retention (v1+) → founder-review (v1+) → version-pause
version-pause → (user approves) → next version (back to architecting) OR done
```

The **review board** is a leadership audit pass at every version boundary (v0/MVP, v1, v2). Nine reviewers each audit a single domain in parallel; consolidated fixes go through a bounded coder loop; only failing reviewers re-run.

The **comprehension stack** (product-analyst → competitive-analyst → strategy-analyst) runs once per project. Re-run only on user request via `/edit "rerun comprehension"` if the brief or market materially changed.

### State machine (improvement mode — for adopted or post-MVP products)

```
improving → (per dimension in scope, default order: quality → conversion → revenue → retention → performance)
  refresh-gaps (auditor scoped to dimension) →
  authoring agent writes improvement_plan_<dim>.md →
  PAUSE for user approval →
  bounded coder loop (cap 5) →
  full regression test →
  dimension reviewer →
  PAUSE if non-trivial → next dimension
all dimensions done → improvement_demo.md → version-pause-equivalent → HALT
```

### Entry-mode detection

Run on every fresh `/build` invocation:
- `.orchestrator/state.json` exists → **resume**
- No state, but cwd has code (any of `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `requirements.txt`, `Gemfile`, non-empty `src/`/`app/`/`pages/`) → **adopt**
- No state, no code → **greenfield**

### State machine (targeted-edit mode)

```
edit-request → change-intake → impact-analysis → (user approves change_plan) →
mini-build → (coder → tester → eng-review) → done
```

---

## 2. `state.json` schema

```json
{
  "version": "0.1",
  "entry_mode": "greenfield",
  "phase": "building",
  "current_version": "v0",
  "first_customer_mode": false,
  "current_dimension": null,
  "improvement_round": 0,
  "cycles_this_version": 3,
  "max_cycles_per_version": 10,
  "iterations_per_task": {"task-id-3": 1},
  "max_iterations_per_task": 10,
  "tokens_input_cumulative": 42100,
  "tokens_output_cumulative": 8800,
  "token_budget_input": 200000,
  "token_budget_output": 50000,
  "wall_clock_started_at": "2026-05-05T10:00:00Z",
  "wall_clock_budget_minutes": 60,
  "action_history": [
    {"agent": "coder", "input_hash": "ab12...", "ts": "..."},
    {"agent": "tester", "input_hash": "cd34...", "ts": "..."}
  ],
  "no_progress_streak": 0,
  "last_file_change_ts": "...",
  "last_test_status_change_ts": "...",
  "current_task_id": "task-3",
  "lock": null,
  "completed_versions": ["v0"],
  "completed_improvement_rounds": [],
  "blockers": [],
  "handoffs": [],
  "last_checkpoint_ts": null,
  "checkpoint_every_cycles": 5
}
```

`entry_mode` is one of `greenfield` | `adopt` | `resume` and is set on the very first cycle of a project.
`current_dimension` and `improvement_round` are populated only in `improving` phase.

The supervisor writes this file every cycle. No subagent ever writes it.

---

## 3. Guardrails (hard, supervisor-enforced)

| Guardrail | Limit | On trip |
|---|---|---|
| Max iterations per task | `max_iterations_per_task` (default 10) | Write `blocker.md`, escalate |
| Max supervisor cycles per version | `max_cycles_per_version` (default 10) | Pause, surface partial state |
| Max retries per agent call | 3 | Mark task failed, replan |
| Loop detection (same action hash) | 3 in a row | Force replan; if replan repeats → escalate |
| No-progress detector | 2 consecutive cycles with no file change AND no test-status change | Declare stuck |
| Token budget | `token_budget_input`/`token_budget_output` | Pause for user OK |
| Wall clock | `wall_clock_budget_minutes` | Pause |

Counters are read fresh from `state.json` each cycle. Subagents cannot reset them; the supervisor must verify each value before bumping.

---

## 4. Escalation rule

An agent escalates to the user (writes to `blocker.md` and the supervisor surfaces it) **only when ALL** of:

1. The choice meaningfully changes product, business model, or has high lock-in cost.
2. Defaults (§6) don't clearly resolve it.
3. Both forks are reasonable and the agent cannot proceed without picking.

Otherwise: pick the more conventional default, append to `decisions.md` with reasoning, continue.

---

## 5. Anti-hallucination rules (every agent)

- **No invention.** Before referencing any file, function, route, or library, verify with Read or Grep.
- **Cite the brief.** Every requirements claim quotes `brief.md` or `decisions.md`.
- **Cite the code.** Every technical claim names `file:line`.
- **Tester is deterministic-only.** Run real commands. If a command can't run, write "cannot verify" — never "looks correct."
- **No silent success.** Coder must include verbatim tester pass output in its return when claiming "done."
- **Decision log is append-only.** To override, write a new entry that supersedes the prior one with reasoning.
- **Closed-world deps.** Use only libraries already in `package.json` (or equivalent). Adding one requires a logged decision in `decisions.md`.

---

## 11. Worktree-parallel coder dispatch

The supervisor uses Claude Code's `Task` tool with `isolation: "worktree"` for any plan task whose `parallelizable: true` flag is set by the planner. The planner sets this flag iff:
- The task's `Files likely touched` are disjoint from any concurrently-running task's files.
- No DoD criterion depends on another in-flight task's output.

The supervisor batches up to 3 parallelizable tasks into one Task batch (parallel sibling dispatches in a single cycle = single tool per iteration rule still satisfied). Each subagent runs in an isolated worktree; on return, the supervisor's next cycle merges results (or eng-reviewer does at version boundary).

If a worktree's coder fails, only that worktree is discarded; others continue. Failed tasks return to the queue for the next cycle.

## 12. Supervisor checkpoint-and-resume

The supervisor's own context is the most fragile element of long-running runs. To survive context bloat, auto-compact, or session-end:

**Every 5 cycles OR on any phase transition**, the supervisor writes `.orchestrator/supervisor_handoff.md`:

```
# Supervisor handoff — <ts>

## Current phase
<phase> — version <vX>

## What was just completed
<one paragraph: last 5 cycles in summary>

## What's next
<concrete next action, the agent to dispatch, its input>

## Open threads
- <pending fix loops, deferred tasks, unresolved blockers>

## Counters snapshot
- cycles_this_version: N
- iterations_per_task: {...}
- token usage: input I, output O
- wall clock: M minutes elapsed
```

**On resume** (`/build` invoked with existing state), supervisor reads `supervisor_handoff.md` FIRST, then state.json. If handoff is newer (later ts) than the last action_history entry, the handoff is the source of truth for "what was I doing."

This decouples supervisor continuity from Claude Code's session lifetime. A new Claude Code session starting fresh can pick up exactly where the prior one left off.

## 13. Handoff schema

Every phase transition appends to `state.json.handoffs[]`:

```json
{
  "from_phase": "designing",
  "to_phase": "acquisition",
  "ts": "2026-05-05T12:34:00Z",
  "artifacts_produced": [".orchestrator/design.md"],
  "next_agent": "acquisition",
  "supervisor_notes": "design.md flagged 2 conversion-checklist warnings; acquisition will write landing.md aware of those"
}
```

This makes:
- Replay deterministic (full causal chain on disk)
- Debugging transparent (`/why` can show the handoffs trail)
- Portability cleaner (if ever lifted to OpenAI Agents SDK / LangGraph, handoffs map directly)

## 14. State compaction

At every version-pause, the **compactor** subagent runs. It:
1. Reads `decisions.md` and the new handoff entries since the last compaction.
2. Moves entries older than 2 versions into `decisions_archive.md` (append-only there too).
3. Writes a tight `decisions_compact.md` with: stack/architecture decisions still in force, USP/moat claims, business-model claims, every active override.
4. Supervisor henceforth reads `decisions_compact.md` + recent (last-version) entries from `decisions.md`, not the full archive.

This keeps token usage flat across versions even as decisions accumulate.

## 15. Recursive planning

If the planner's draft has > 20 tasks, it spawns **sub-planners** via Task — one per coherent area (e.g. one for `auth flow`, one for `payments`, one for `dashboard`). Sub-planners write `plan_<area>.md` files; planner aggregates into top-level `plan.md` with sub-area pointers. This keeps each sub-plan small enough to reason about and lets the supervisor schedule across areas.

## 16. A/B at strategic decisions (architect / designer / strategy-analyst)

For these three high-leverage roles, the supervisor dispatches **two parallel candidates** in one Task batch. Both produce their artifact (e.g. `architecture_a.md` and `architecture_b.md`). The **judge** subagent then reads both and picks one with a written rationale appended to `decisions.md`. The losing candidate is renamed `<artifact>_alt.md` (kept on disk for audit; not deleted).

This costs ~2x tokens at three points in the build. The expected uplift: meaningfully better strategic outputs, fewer late re-architects, less moat-erosion.

## 17. MCP as the action layer

External actions (database queries, Stripe operations, deploy triggers, Slack/email, observability writes) prefer **MCP servers** over direct API calls or shell commands.

- The architect lists required MCP servers in `architecture.md` under `## MCP servers`.
- The coder, when implementing a feature that needs an external action, checks if an MCP server exists for it. If yes: invoke via MCP. If no: log a decision that the architect must address before the next version (or escalate).
- Bash is reserved for one-off shell things (running tests, file moves, version control).

This keeps actions structured, auditable, and reusable across projects.

## 6. Production defaults cheatsheets

These are the silently-applied defaults. Each agent's system prompt embeds the slice relevant to it. The supervisor logs every default applied to `decisions.md` with one-line reasoning.

### File deletion (project-wide rule)
- Never delete `.tsx`/`.ts`/`.css` (and equivalent) project files. Orphan instead — remove imports; let bundler exclude.
- Applies to coder, eng-reviewer fixes, review-board fixes, /improve fixes.

### Auth
- Email + Google OAuth; magic link optional.
- httpOnly cookies for sessions, SameSite=Lax.
- Password reset flow with single-use, time-limited token.
- Rate-limited login (5 attempts / 15 min).
- CSRF token on cookie-auth POST.

### Data
- Postgres + Prisma (or project's existing ORM).
- UUIDs for public IDs; `id` (internal int) optional.
- `createdAt`/`updatedAt` on every table.
- Soft deletes (`deletedAt`) on user-owned data.
- Indexes on every foreign key and on every column used in `WHERE`/`ORDER BY` of frequent queries.

### API
- REST with predictable verbs.
- Validation at boundary (zod / pydantic / equivalent).
- Structured error envelopes: `{error: {code, message, details?}}`.
- Idempotency keys on mutating endpoints that can retry.
- Pagination: cursor-based for feeds; offset for admin tables.

### Frontend
- Mobile-first. Single-column at ≤430px. Thumb-reachable primary actions.
- Loading, empty, error states for every async surface.
- Optimistic UI for fast actions (likes, toggles); rollback on failure.
- Skeleton loaders, not spinners, for above-the-fold content.
- Focus management on route change; keyboard accessibility.

### Forms
- Client + server validation.
- Inline errors next to the field; never a generic "something went wrong" without specifics.
- Disabled submit while pending.
- Autosave for forms with >5 fields or >30s estimated time.

### Payments
- Stripe.
- Webhooks are source of truth, not the client return URL.
- Never trust client-side amounts.
- Idempotency keys on payment intents.
- Receipts via email + in-app.

### Notifications
- In-app feed AND at least one external channel (email).
- Never depend on a single external channel (per project memory).
- Digest by default; real-time only for high-urgency.

### Security
- Secrets in env, never in repo.
- No PII in logs.
- Rate limits on every public endpoint.
- RLS or per-row authz checks; never trust client-supplied user IDs.
- CSRF on cookie-auth mutations.
- Input sanitization at every boundary.

### Performance
- Pagination by default. No unbounded queries.
- N+1 query check; use `include`/`select` deliberately.
- Image optimization (next/image or equivalent); lazy-load below the fold.

### Observability
- Structured logs with request IDs.
- Error tracking (Sentry or equivalent).
- Basic uptime ping.

### Legal/UX hygiene
- Terms + Privacy linked in footer.
- Cookie banner if EU traffic likely.
- Account deletion in user settings.
- Data export available on request.

### Deploy
- Vercel (or PaaS-equivalent) for MVP.
- Env-based config; no hardcoded URLs.
- Preview deploys for every PR.

### Conversion (designer + acquisition)
- Above-the-fold value prop in <10 words.
- Social proof within first scroll.
- Single primary CTA; secondary CTAs visually de-emphasized.
- Friction audit on signup/checkout: every required field justified or removed.
- Trust signals near the CTA (security badges, testimonials, free-trial copy).

### Funnel taxonomy (planner)
Every task is tagged with one:
- `acquisition` — landing, SEO, share, ads
- `activation` — signup, onboarding, first value moment
- `retention` — re-engagement, lifecycle email, return triggers
- `revenue` — pricing, paywall, checkout
- `infra` — auth, db, deploy, observability — only scheduled when blocking a value task

Supervisor schedules in funnel-priority order, not author order.

---

## 7. File conventions

- All `.orchestrator/` files are markdown except `state.json`.
- Append-only files: `decisions.md`, `standup.md`. Use `Edit` with append-style ops or `Write` after Read; never blow away history.
- Single-writer files: `architecture.md` (architect), `design.md` (designer), `landing.md`/`growth.md` (acquisition + retention), `pricing.md` (BA), `plan.md` (planner), `state.json` (supervisor), `change_plan.md` (impact analyzer).
- Reviews live under `.orchestrator/reviews/<version>/<role>_review.md` — one file per reviewer per version.
- The `brief.md` is locked after intake approval. To change it, the user must run `/edit "update brief: ..."` which goes through change-intake.

### File deletion policy

**Never delete `.tsx` / `.ts` / `.css` (and equivalent) project files**, even if they look unused or are being replaced. Orphan them instead — leave the file on disk; remove imports; let the bundler exclude them.

This applies to coder, eng-reviewer fix tasks, review-board fix tasks, and `/improve` tasks. If a reviewer's fix recommendation includes deletion, downgrade it to "remove imports / orphan."

Why: deletions caused unrecoverable losses on this user's projects historically. The cost of an unused file is trivial; the cost of a wrongful deletion can be high.

### Standup paragraph format
```
## [ts] [agent] [phase] [task-id?]
Did: <one-line summary of what changed>.
Result: <pass/fail/blocked + key signal>.
Next: <recommendation>.
```

### Decision entry format
```
## [ts] [agent] — <decision title>
**Decision:** <what was chosen>.
**Alternative considered:** <what was not chosen>.
**Why:** <one-line reasoning, citing brief or default>.
**Reversible:** <yes/no>.
```

---

## 8. Model selection

Each subagent declares a preferred model in its frontmatter:
- **Haiku** — tester, blockers checker, rote verification.
- **Sonnet** — coder, planner, change-intake, impact-analyzer.
- **Opus** — intake, architect, designer, eng-reviewer, business-analyst, founder-reviewer, acquisition, retention.

The user can override globally via Claude Code settings.

---

## 9. Pause-point UX

When the supervisor pauses, it surfaces:
1. Phase name and version.
2. What was completed.
3. The relevant artifact path (e.g. `demo.md`, `change_plan.md`, `blocker.md`).
4. The user's three options: approve / change / abort.

The supervisor stops there and waits. The user replies in plain language; the supervisor parses intent and resumes.

---

## 10. Resume after kill

On `/build` invocation:
1. If `.orchestrator/state.json` exists and `lock` is null → resume from `phase`.
2. If `lock` is set → another `/build` may be running. Refuse with a message.
3. If state is corrupt → write `blocker.md` and ask user.

The supervisor takes the lock at start of cycle and releases it on pause/end. `kill -9` leaves the lock set; `/build` then offers to break it after confirming.
