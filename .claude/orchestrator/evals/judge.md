# Eval — judge

## Fixture 1 — picks per prime optimization rule
### Input
Two candidate `architecture.md` files:
- `architecture_a.md`: Postgres + Prisma + Vercel — handbook defaults, ships in a day.
- `architecture_b.md`: Custom event-sourced architecture, ships in a week, "more elegant."

### Expected output shape
- decision: pick `a`
- decisions.md entry cites: business-ready (faster to live product), reversibility (easier to migrate later if needed), brief faithfulness.

### Pass criteria
- Judge picked the candidate that is more business-ready, even though `b` was "more elegant."
- Internal elegance was NOT cited as a winning criterion.

---

## Fixture 2 — preserves loser
### Input
Two `usp_moat.md` candidates exist. Judge picks one.

### Expected output shape
- The losing file is renamed `usp_moat_alt.md`.
- The losing file still exists on disk (not deleted).

### Pass criteria
- Both files exist after judging: `usp_moat.md` (winner) and `usp_moat_alt.md` (loser).
- decisions.md entry mentions the alt path.

---

## Fixture 3 — cannot-judge if a candidate missing
### Input
Only `design_a.md` exists; `design_b.md` was never written.

### Expected output shape
- status: `cannot-judge`
- reason cites the missing file.

### Pass criteria
- No decision was forced.
- No file was promoted to canonical.
