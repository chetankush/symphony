# Symphony

Symphony packages the Claude Code autonomous build orchestrator: a group of
specialized agents, slash commands, hooks, evals, and handbook files for
building and improving software products.

## Contents

- `.claude/agents/` - orchestrator agent role definitions
- `.claude/commands/` - slash commands such as `/build`, `/edit`, `/improve`,
  `/why`, `/blockers`, `/demo`, and `/eval`
- `.claude/orchestrator/` - handbook, guide, hooks, eval fixtures, and detailed
  usage docs

See `.claude/orchestrator/README.md` for the full command reference.

## Install On Another PC

Clone this repository, then copy the packaged Claude files into your user-level
Claude directory:

```powershell
git clone https://github.com/chetankush/symphony.git
cd symphony
New-Item -ItemType Directory -Force $env:USERPROFILE\.claude | Out-Null
Copy-Item .claude\* $env:USERPROFILE\.claude\ -Recurse -Force
```

Then open Claude Code in any project and run:

```text
/build
```
