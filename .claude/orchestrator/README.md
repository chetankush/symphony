# Autonomous Build Orchestrator

A multi-agent orchestrator for Claude Code that builds shippable, sales-focused software products end-to-end with bounded autonomy.

**Positioning:** *Paperclip runs a company. This ships products that sell. Zero-install, opinionated about quality, obsessed with conversion.*

---

## Quick start

In any project directory:

```
cd my-product/
claude        # start Claude Code
> /build
```

Works in three scenarios — `/build` auto-detects which one you're in:

### Greenfield (empty/new directory)
1. Intake interview — 8–10 strategic questions, one at a time (hard cap 10)
2. You approve the inferred assumptions → brief locks
3. Comprehension stack runs: product analyst → competitive analyst → strategy analyst (writes product spec, roles, stories, use cases, flows, test cases, competitive analysis, USP/moat)
4. You validate the comprehension picture (small batch — most was derived from your own intake)
5. v0/MVP builds autonomously with hard guardrails. Every code task cites a user story; tester verifies the cited test cases; eng-reviewer fails the version if any must-priority story isn't covered by a passing test case.
6. Pause at end of MVP for ship-it / change-direction
7. Continue to v1, pause again. v2, pause again.

### Adopt (existing codebase, no orchestrator state yet)
1. **Auditor** reverse-engineers the code into draft `brief.md`, `architecture.md`, `design.md`, `funnel.md`, `audit_gaps.md`
2. **Product analyst** writes exact-behavior `product_spec.md`, `user_roles.md`, `user_stories.md`, `use_cases.md`, `user_flows.md`, `test_cases.md` (every claim cited `file:line`)
3. **Competitive analyst** does live web research; writes `competitive_analysis.md` with feature comparison, blend reading ("looks like A / behaves like B / monetizes like C"), differentiation gaps
4. **Strategy analyst** writes `usp_moat.md` — top 3 USPs, the wedge, moat candidates rated weak/medium/strong with current vs aspirational, anti-moat (where you're vulnerable)
5. You review and correct the inferred picture → it locks
6. You pick: `/improve <dimension>` or build v1 or `/edit "..."`

### Resume (orchestrator state already exists)
- `/build` picks up exactly where it stopped. Survives `Ctrl+C` and session close.

### Flags
- `/build --first-customer` — optimize for shortest path to a paying user. Cuts polish, edge cases, internal tooling.

---

## Commands

| Command | Purpose |
|---|---|
| `/build` | Start (greenfield), adopt (existing project), or resume. `--first-customer` for shortest-path-to-revenue. |
| `/improve [dimension]` | Improvement cycle on adopted/post-MVP product. Dimensions: `quality` `conversion` `retention` `revenue` `performance` `all`. Default `all`. |
| `/edit "what to change"` | Targeted edit on a built product. |
| `/why [topic]` | Show the decision trail. |
| `/blockers` | Show what's stuck. |
| `/demo` | Open the latest version's demo doc. |
| `/eval <agent>\|all` | Run eval fixtures against an agent (or all). Catches regressions when prompts change. |

---

## What gets created

### Per project (`./.orchestrator/`)
- `brief.md` — your locked product brief
- `decisions.md` — append-only decision log (commit this)
- `architecture.md`, `design.md`, `plan.md` — per-version artifacts (commit)
- `product_spec.md`, `user_roles.md`, `user_stories.md`, `use_cases.md`, `user_flows.md`, `test_cases.md` — comprehension artifacts (commit; these are the verification surface)
- `competitive_analysis.md`, `usp_moat.md` — strategic artifacts (commit)
- `landing.md`, `funnel.md`, `pricing.md`, `growth.md` — business artifacts (commit)
- `audit_gaps.md`, `improvement_plan_<dim>.md` — adopt + improve mode artifacts (commit)
- `reviews/<version>/<role>_review.md` — review-board outputs per version (commit)
- `review_board_fixes_<version>.md` — consolidated fix list per version pause (commit)
- `<artifact>_a.md` / `<artifact>_b.md` (transient, deleted after judge) and `<artifact>_alt.md` (loser, preserved for audit) — A/B candidate files
- `decisions_compact.md`, `decisions_archive.md` — compacted + archived decisions (commit)
- `plan_<area>.md` — sub-plans when recursive planning kicks in (commit)
- `supervisor_handoff.md` — supervisor checkpoint, latest only (commit)
- `state.json` — runtime state (gitignore)
- `standup.md`, `blocker.md` — runtime logs (gitignore)
- `demo.md`, `retro.md`, `improvement_demo.md` — pause-point artifacts (commit)

Suggested `.gitignore`:
```
.orchestrator/state.json
.orchestrator/standup.md
.orchestrator/blocker.md
```

### Globally (already installed at `~/.claude/`)
- `agents/*.md` — 13 subagent role files
- `commands/{build,edit,why,blockers,demo}.md` — slash commands
- `orchestrator/handbook.md` — full reference (state schema, guardrails, defaults, escalation)
- `orchestrator/README.md` — this file

---

## Roster

## Prime optimization rule

When any agent has discretion, the tie-breaker is: **optimize for business-ready + best UX + product success.** Internal elegance and refactor cleanliness are not tie-breakers. Hard guardrails (no-delete, append-only, story coverage, regression tests) override this rule.

## Architecture upgrades (matches 2026 SOTA)

- **Hooks layer** (`~/.claude/orchestrator/hooks/`) — deterministic enforcement that the model cannot bypass: no-delete, append-only on `decisions.md`/`standup.md`, post-Task action_history bump + 3-in-a-row loop detection, lock release on Stop. Install via `~/.claude/settings.json` (see `hooks/README.md`).
- **Supervisor checkpoint-and-resume** — every 5 cycles + on every phase transition, supervisor writes `supervisor_handoff.md`. Survives session end / context bloat.
- **Worktree-parallel coder dispatch** — planner flags tasks with `Parallelizable: true` when files-likely-touched are disjoint. Supervisor dispatches up to 3 in one Task batch with `isolation: "worktree"`. Single-tool-per-iteration rule still satisfied (parallel siblings = one batch).
- **Single-tool-per-iteration** — one cycle = one Task batch + one state update + one standup append. Deterministic, replay-safe.
- **Handoff schema** — every phase transition appends to `state.json.handoffs[]` with `{from_phase, to_phase, artifacts_produced, next_agent, supervisor_notes}`. Causal trail.
- **A/B at strategic decisions** — architect, designer, strategy-analyst each produce two candidates (`_a` / `_b`); judge agent picks per the prime optimization rule; loser preserved as `<artifact>_alt.md`.
- **State compaction** — at every version-pause, compactor moves entries older than 2 versions to `decisions_archive.md` and writes a tight `decisions_compact.md` for supervisor. Token usage stays flat across versions.
- **Recursive planning** — if planner's draft has > 20 tasks, sub-planners produce per-area plans (`plan_<area>.md`); top `plan.md` is the index.
- **MCP as action layer** — architect lists required MCP servers (Stripe, Postgres, Slack, etc.); coder prefers MCP invocation over direct API calls.
- **Eval harness** — `~/.claude/orchestrator/evals/<agent>.md` fixtures + `/eval` slash command. Run before merging a prompt change.

### Producers

| Agent | When | Optimizes for |
|---|---|---|
| Intake | Once at start (greenfield) | Product clarity |
| Auditor | Once at start (adopt) — and scoped re-runs for `/improve` gap refresh | Faithful reverse-engineering |
| Product analyst | Once per project (after intake or auditor) | Exact behavior + verifiable stories/flows/test cases |
| Competitive analyst | Once per project | Market reality + blend reading + differentiation gaps |
| Strategy analyst | Once per project | USP, wedge, moat, anti-moat |
| Architect | Once per version | Simplicity, conversion-path latency |
| Designer | Once per version | Conversion patterns |
| Acquisition | Once per version (v0+) | Top-of-funnel |
| Planner | Once per version | Funnel-stage prioritization |
| Coder | Per task | Working code that passes gates |
| Tester | After each task | Honest signal |
| Eng-reviewer | End of version | Maintainability |
| Business analyst | v1, v2 | Revenue |
| Retention | v1, v2 | Re-engagement |
| Founder reviewer | v1, v2 | Sellability |
| Change-intake / Impact-analyzer | Targeted-edit mode | Safe scoped changes |
| Judge | A/B selection at architect / designer / strategy-analyst | Prime optimization rule |
| Compactor | Every version-pause (v2+) | Flat token usage as decisions accumulate |
| Sub-planner | When planner draft > 20 tasks | Coherent area-scoped sub-plans |

### Reviewers (run as a "review board" at every version-pause: MVP, v1, v2)

| Reviewer | Audits |
|---|---|
| Brief reviewer | brief.md vs realized product (drift, missed requirements, silent overrides) |
| Spec reviewer | product_spec / stories / use_cases / flows / test_cases coverage |
| Competitive reviewer | Light re-fetch of competitors; differentiation gap status |
| Strategy reviewer | USP delivery, moat progression, anti-moat exposure |
| Architecture reviewer | Code vs architecture.md, layering, conversion-path latency |
| UX reviewer | design.md compliance, mobile, a11y, friction, loading/empty/error states |
| Acquisition reviewer | Landing copy live, OG/SEO present, funnel events fired, onboarding emails wired |
| Plan reviewer | Silent task drops, scope creep, must-priority story coverage rate |
| Retention reviewer | (v1+) Lifecycle emails wired, empty states present, frequency caps, opt-out |

All reviewers run **in parallel**. Consolidated fixes go through a bounded coder loop (max 5 cycles, 2 fix passes); only failing reviewers re-run after each pass.

Eng-reviewer (already listed under producers' verification gates) runs **before** the review board as the deterministic code-quality pass. Reviews live in `.orchestrator/reviews/<version>/<role>_review.md`.

The **supervisor** lives inside `/build` itself — it dispatches subagents via the Task tool and enforces guardrails.

---

## Guardrails (hard caps; can't be bypassed)

- Max 10 iterations per task
- Max 10 supervisor cycles per version
- Max 3 retries per agent call
- Loop detection: same action 3× in a row → force replan
- No-progress detector: 2 cycles, no file change, no test status change → stuck
- Token budget: 200k input / 50k output cumulative per version (configurable)
- Wall clock: 60 min per version (configurable)

Tripped guardrail → write `blocker.md`, surface to user, halt.

---

## Pause points (only times you're interrupted)

- After intake — review assumptions, approve brief
- End of v0 / v1 / v2 — ship-it or change-direction
- Any blocker
- Any guardrail trip
- Targeted-edit: once after impact analysis

---

## What it won't do

- Run a server or daemon. (Use `/build` again to resume — that's the whole loop.)
- Skip the eng-review gate.
- Skip the review board at version boundaries (9 reviewers, all must clean before pause).
- Skip the user pause at version boundaries.
- Add a dependency without logging a decision.
- Claim a task is done without verbatim tester output.
- Delete `.tsx`/`.ts`/`.css` project files (hook-enforced). Orphans them instead.
- Overwrite `decisions.md` or `standup.md` (hook-enforced). Append-only.
- Loop on the same action 3× in a row (hook-enforced via post-task.js).
- Pick "elegant but not business-ready" over "less elegant but ships." Prime optimization rule overrides aesthetic preference.

---

## Tips

- **Commit the brief and decisions log.** They're your product memory.
- **Read `decisions.md` regularly.** The orchestrator's reasoning is all there.
- **Override decisions by appending new entries.** Never edit history.
- **Use `/edit "..."` for any change after v0 lands.** Don't manually edit `brief.md`.
- **`/build --first-customer` is for the first version of a real product.** It cuts everything not on the path to revenue.

---

## First-time setup

1. Install hooks. Open `~/.claude/settings.json` and add the block from `~/.claude/orchestrator/hooks/README.md`. Without hooks, the determinism guarantees become advisory.
2. Optional: set per-project `.claude/settings.local.json` overrides (e.g. higher token budget for large projects).
3. Run `/eval all` once to verify your install doesn't break the agent prompts.

## Reference

Full handbook: `~/.claude/orchestrator/handbook.md`
Hooks install: `~/.claude/orchestrator/hooks/README.md`
Eval harness: `~/.claude/orchestrator/evals/README.md`
Spec: `<project>/docs/superpowers/specs/2026-05-05-autonomous-build-orchestrator-design.md`
