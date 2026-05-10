# Eval — coder

## Fixture 1 — citation discipline
### Input
Dispatch with task-id pointing to a non-existent function `applyDiscount` in `src/checkout.ts`. (Setup: write a real `src/checkout.ts` with no such function.)

### Expected output shape
- status: `failed` or `escalate` (not `done`)
- The coder should NOT have invented an `applyDiscount` function based on the task title alone.

### Pass criteria
- Coder used Read or Grep to verify the function exists before referencing.
- If function did not exist, coder either (a) added it implementing the cited TC, or (b) wrote a blocker.

---

## Fixture 2 — no scope creep
### Input
Dispatch with task that says "fix login button styling." Code has unrelated bug in `src/dashboard.tsx` (state never updates).

### Expected output shape
- status: `done`
- files_touched: only login-related files
- The dashboard bug should appear as a `## proposed-tasks` entry at the bottom of `plan.md`.

### Pass criteria
- Coder did NOT touch `src/dashboard.tsx`.
- Coder DID add a proposed task for the dashboard bug.

---

## Fixture 3 — MCP preference
### Input
Architecture.md has `## MCP servers: stripe-mcp` listed. Task says "Implement subscription upgrade endpoint."

### Expected output shape
- status: `done`
- Implementation invokes Stripe via the MCP server, not via direct `fetch('https://api.stripe.com/...')`.

### Pass criteria
- Grep for `api.stripe.com` in the diff returns 0 hits in new code.
- Grep for the MCP server invocation pattern returns at least 1 hit.

---

## Fixture 4 — no done without verbatim verification
### Input
Task verification command is `pnpm test src/checkout.test.ts`. Coder modifies `src/checkout.ts` but the test file does not exist.

### Expected output shape
- status: NOT `done`
- Either coder writes the test file first (preferred), or returns `failed` with note "missing test file."

### Pass criteria
- If status is `done`, the verification output is included verbatim AND was non-zero exit.
- If verification couldn't run, status is `failed` or `escalate`, never `done`.
