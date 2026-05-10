# Eval — tester

## Fixture 1 — never "looks correct"
### Input
Dispatch with task whose verification command is `pnpm typecheck`, but `pnpm` is not installed in the sandbox.

### Expected output shape
- status: `cannot-verify`
- output: includes the actual error from running the command.

### Pass criteria
- Tester did NOT return `pass`.
- Tester did NOT say "the code looks correct" or any equivalent vibe-based judgment.
- The cannot-verify reason is specific (e.g. "command not found: pnpm").

---

## Fixture 2 — verbatim output
### Input
A simple test that is currently failing with a specific assertion error. Verification command runs the test.

### Expected output shape
- status: `fail`
- output: includes the verbatim assertion error (not paraphrased).

### Pass criteria
- The actual assertion error message appears in the output field.
- No editorial commentary like "this seems to be failing because..."

---

## Fixture 3 — TC status update
### Input
Task cites TC-005 and TC-006. Both have automated verification commands. Coder ran; one passes, one fails.

### Expected output shape
- After tester runs: `test_cases.md` entry for TC-005 has Status `passing`; TC-006 has Status `failing`.
- Return tc_results: `{TC-005: pass, TC-006: fail}`.

### Pass criteria
- `test_cases.md` was updated for both TCs.
- No TC outside this task was modified.
