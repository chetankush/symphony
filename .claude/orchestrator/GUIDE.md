# Using guide

Compact tutorial for the autonomous build orchestrator. Read top-to-bottom once; bookmark the cheat sheet.

---

## Install (one-time, 2 minutes)

1. Open `~/.claude/settings.json`.
2. Paste the `"hooks"` block from `~/.claude/orchestrator/hooks/README.md`.
3. Verify: run `/eval all` from any project. If green, you're set.

That's it. Nothing else to install.

---

## The 3 scenarios

| You have... | Run | What happens |
|---|---|---|
| Empty directory + an idea | `/build` | Intake interview → comprehension → builds v0 |
| Existing codebase | `/build` | Auditor reverse-engineers it → you pick direction |
| Project already started by orchestrator | `/build` | Resumes from saved state |

`/build` auto-detects which one you're in. You don't pick.

---

## Tutorial 1 — Build something new (greenfield)

```
mkdir my-product && cd my-product
claude
> /build
```

**What you'll experience:**

1. **Interview (~5–8 min).** 8–10 questions max, one at a time. Answer in your own words. Skip what you don't know.
2. **Assumption review (5 min).** Orchestrator shows ~30 silent defaults it applied (auth = email + Google, db = Postgres, etc.). Skim. Override anything wrong. Approve.
3. **Comprehension stack runs autonomously (~15 min).** Product analyst writes user stories + test cases. Competitive analyst does web research. Strategy analyst writes USPs/moat. **Pause** — review the picture.
4. **v0/MVP builds autonomously (30–90 min).** Architect → designer → acquisition → planner → coder loop → tester → 9 reviewers. **Pause** at end of MVP.
5. **You decide:** ship-it / change-direction / abort. Reply in plain English. The next `/build` continues.
6. **Repeat for v1, v2.** Each pauses at the end.

**Tip:** for fastest path to one paying user, run `/build --first-customer`. It cuts everything not on the revenue path.

---

## Tutorial 2 — Improve an existing project (adopt)

```
cd existing-project
claude
> /build
```

**What you'll experience:**

1. **Auditor runs (5–10 min, read-only).** Reverse-engineers your code into draft `brief.md`, `architecture.md`, `design.md`, `audit_gaps.md`.
2. **Comprehension runs.** Product/competitive/strategy analysts.
3. **Pause** — you see:
   - inferred brief (correct it)
   - audit gaps grouped by dimension (quality / conversion / retention / revenue / performance)
   - top differentiation opportunities vs competitors
4. **Pick a direction:**

```
> /improve quality            # fix tests, complexity, dead code
> /improve conversion         # landing, signup friction, mobile UX
> /improve retention          # lifecycle emails, empty states
> /improve revenue            # pricing, paywall, Stripe webhooks
> /improve performance        # N+1, pagination, image opt
> /improve all                # all of the above in order
> /build                      # build a new v1 on top of your code
```

5. **Improvement cycle runs autonomously.** Plan → coder loop → regression tests → dimension reviewer. **Pause** at end. Approve / change / abort.

---

## Tutorial 3 — Make one specific change

```
> /edit "add dark mode toggle to settings page"
```

**What happens:**

1. Change-intake asks ≤3 clarifying questions if needed.
2. Impact analyzer reads codebase, lists affected files + risk + test surface.
3. **Pause** — approve the change plan.
4. Coder → tester (full regression suite) → eng-reviewer.
5. Done. `decisions.md` gets a new entry.

Lower iteration cap than `/build` (5 cycles). Don't use for major feature additions — use `/build` for v1 instead.

---

## The 7 commands

| Command | Use when |
|---|---|
| `/build` | Start, adopt, or resume a build |
| `/build --first-customer` | Optimize for fastest path to one paying user |
| `/improve <dim>` | Fix one dimension on existing/built product |
| `/edit "..."` | One specific scoped change |
| `/why [topic]` | Show why something was decided |
| `/blockers` | Show what's stuck |
| `/demo` | Show how to run + review the latest version |
| `/eval <agent>\|all` | Verify agent prompts didn't regress |

---

## At a pause point

The orchestrator stops at: end of intake, end of MVP, end of v1, end of v2, after impact analysis (`/edit`), or any blocker.

You see: phase, what completed, the artifact path, three options.

**Reply in plain English.** Examples:

```
"Looks good, ship it."
"Change direction — drop the marketplace angle, make it B2B SaaS."
"The pricing is wrong. Make the middle tier $29, not $49."
"Abort, I want to start over."
```

Run `/build` again. Supervisor parses your intent and continues.

---

## What you'll see in `.orchestrator/`

```
.orchestrator/
├── brief.md                    ← your locked product brief
├── decisions.md                ← append-only decision log (read this often)
├── product_spec.md             ← exact behavior per surface
├── user_stories.md             ← US-001, US-002, ...
├── test_cases.md               ← TC-001, TC-002, ... with pass/fail status
├── architecture.md             ← stack + module map + MCP servers
├── design.md                   ← design language + screens
├── plan.md                     ← current version's task list
├── landing.md                  ← marketing page copy
├── pricing.md                  ← pricing model (v1+)
├── usp_moat.md                 ← positioning + defensibility
├── competitive_analysis.md     ← market reality
├── reviews/v0/*_review.md      ← the 9 reviewer outputs
├── demo.md                     ← how to run, what's done
├── retro.md                    ← what worked / didn't
├── standup.md                  ← cycle-by-cycle log
└── state.json                  ← runtime state
```

**Commit everything except** `state.json`, `standup.md`, `blocker.md`. The rest is your product memory.

---

## When things go wrong

| Symptom | Action |
|---|---|
| Stuck for 2+ minutes silent | `Ctrl+C`, run `/blockers`. Read what's stuck. |
| Same error 3× in a row | Hooks already wrote a `blocker.md`. Run `/blockers`. |
| Decisions seem wrong | `/why <topic>`. Override by running `/edit "decision: <new direction>"`. |
| Orchestrator forgot context after long run | Just run `/build` again. Supervisor reads `supervisor_handoff.md` to resume. |
| Want to undo last decision | Append a new entry to `decisions.md` overriding. Run `/edit` to make it real. |
| Eval fails after editing a prompt | Don't ship the prompt. Read the failure, fix the prompt. |

---

## The 3 things that prevent disaster

1. **Hooks must be installed.** Without them, no-delete and append-only are advisory.
2. **Don't manually edit `brief.md` after lock.** Use `/edit "update brief: ..."`.
3. **Don't skip pause points.** Every approval gate is there because the next phase's autonomy is bounded by your call.

---

## A 60-second mental model

- One slash command → 26 specialized agents → 1 product.
- The supervisor dispatches; each agent has one job and reads only the slice it needs.
- Producers write artifacts; reviewers audit them; the judge picks A/B candidates.
- State lives in `.orchestrator/`. Hooks enforce rules. You pause at version boundaries.
- Every decision is in `decisions.md`. Every story has a test case. Every test case has a status.
- The rule for any tie: business-ready + best UX + product success.

That's the whole thing.

---

## Reference

Full handbook: `~/.claude/orchestrator/handbook.md`
Hooks setup: `~/.claude/orchestrator/hooks/README.md`
Eval harness: `~/.claude/orchestrator/evals/README.md`
README: `~/.claude/orchestrator/README.md`
