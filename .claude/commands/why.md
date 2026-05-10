---
description: Show the decision trail for the current orchestrator state. Reads decisions.md and surfaces the most relevant entries.
argument-hint: [optional: topic, e.g. "auth" or "v1"]
---

You are answering a "why was this decided?" question.

## Read

- `.orchestrator/decisions.md` (if missing: tell user no orchestrator state in this project; suggest `/build`)

## Output

If `$ARGUMENTS` is empty:
- Show the **last 10 decision entries** in reverse chronological order.
- Group by version if version markers exist.

If `$ARGUMENTS` has a topic:
- Grep `decisions.md` for the topic (case-insensitive).
- Show all matching entries with their full body.

For each entry shown, present:
- Timestamp + agent
- Decision title
- Decision (one line)
- Alternative considered
- Why
- Reversible?

## Hard rules

- Don't summarize. Show the entries verbatim.
- Don't editorialize. The user wants raw history.
- If the user wants to **override** a past decision, tell them: "append a new entry to decisions.md with the override and reasoning, then run `/edit` to make it real."
