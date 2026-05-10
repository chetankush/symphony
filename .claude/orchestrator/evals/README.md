# Agent eval harness

Per-agent fixtures for catching regressions when you edit subagent prompts. Each agent gets a Markdown file with sample inputs and expected output shape.

## Format (per-agent file: `<agent>.md`)

```
# Eval — <agent>

## Fixture 1 — <name>
### Input
<the dispatch input the supervisor would pass>

### Expected output shape
- <field>: <description>
- <field>: <description>

### Pass criteria
- <verifiable criterion>
- <verifiable criterion>
```

## Running

```
/eval <agent-name>
```

Runs every fixture for that agent. For each fixture, dispatches the agent via Task with the fixture's input, captures the return, then evaluates against the pass criteria. Reports pass/fail per fixture.

```
/eval all
```

Runs all eval files. Use before merging a prompt change.

## What to evaluate

- **Coder:** correct DoD interpretation, no scope creep, MCP preference, citation discipline
- **Tester:** never says "looks correct"; reports cannot-verify when commands missing
- **Judge:** picks per the prime optimization rule, cites both candidates
- **Planner:** parallelizable flag accuracy, story coverage, no orphan tasks
- **Auditor:** every claim cites file:line; nothing fabricated
- **Product analyst:** stories trace to use cases trace to test cases (chain unbroken)
- **Designer:** conversion checklist co-signed; mobile-first respected

## When to add a fixture

Every time an agent fails in a way that wasn't caught — write the fixture so it can't fail that way silently again.
