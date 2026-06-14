# 2026-06-14 UX Walkthrough — Design

> **For agentic workers:** This is a research/audit spec, not an implementation spec. The "delivery" is a markdown bug report. No code changes ship from this work.

## Goal

Exhaustively walk the VastuPlan 2D app via a real browser, find user-facing functionality issues, and write them up in a single markdown bug report. Post-merge of the room-props-and-drag-freeze batch (PR #50, merged 2026-06-14), the user wants to know: "are there more bugs we haven't caught yet?"

## Approach

Live browser walk-through against the local dev server. No code audit, no Playwright spec files, no new deps.

### Test rig

- `npm run dev` running in the background on localhost:5173.
- Playwright MCP tools for navigation, interaction, snapshot, console capture.
- Browser DevTools console monitored for errors during every interaction.

### Sequence (three phases, ~90-120 min)

**Phase 1 — Foundational flows (~30-40 min)**
- App init, first load, default state
- Add room (5+ types: Bedroom, Kitchen, Bathroom, Living Room, Dining, etc.)
- Drag room (canvas)
- Resize room (each handle: NW, N, NE, E, SE, S, SW, W if present)
- Rotate room
- Multi-select (shift+click, marquee if it exists)
- Delete room (button, keyboard)
- Properties panel: single, multi, empty, stale (after undo), view-mode, comment-mode
- Undo / redo (multiple levels, including cross-floor)
- Mode switch: edit → view → comment → edit
- Dark mode toggle, persist across reload

**Phase 2 — Sharing & exports (~20-30 min)**
- Share link: generate (view, comment), paste into new tab, verify plan loads, edit-after-share
- Export PNG
- Export JSON: save, then re-import, verify roundtrip
- Project Manager: save, list, load, delete
- Presentation export: open, configure, export
- Print (browser print preview)

**Phase 3 — AI / collab / mobile / edges (~30-40 min)**
- AI analysis: click "Analyze Floor Plan", see what happens (no API key? mocked?)
- Collab: two browser tabs on same plan via shared link, edit in one, see in other
- Mobile viewport: resize to 375×812, test tab switch, drag, tap, properties panel
- Keyboard shortcuts: Ctrl+Z, Ctrl+Shift+Z, Delete, Backspace, Escape, F1 (help), arrow keys (nudge)
- Edge cases: empty plan, very small rooms (2×2), very large rooms (100×100), rooms on boundary, wall thickness extremes (4.5", 14"), many rooms (20+), undo all the way, redo all the way, click on a room then undo past the deletion

### Output

- One file: `docs/ux-audit/2026-06-14-ux-walkthrough.md`
- Findings committed to git as they're written (so the user can `git log -p` to follow along)
- Each finding has the structure:
  - **ID:** `U-N` (sequential)
  - **Title:** one-line
  - **Severity:** P0 / P1 / P2 / P3
  - **Surface:** canvas / properties / mode / share / export / mobile / collab / etc.
  - **Repro:** numbered steps
  - **Observed:** what actually happens
  - **Expected:** what should happen
  - **Hypothesis:** root cause guess (file + line if obvious from the snapshot)
  - **Trace:** console log, browser state, or screenshot reference

### Severity scale

- **P0:** broken core flow, data loss, app crash. Stop and fix now.
- **P1:** degraded UX (confusing affordance, dead button, broken error message, off-by-one). Fix this sprint.
- **P2:** cosmetic, edge case, or design polish. File for when adjacent work happens.
- **P3:** minor / subjective nit. Track for awareness.

### Bug ID convention

`U-N` where N is sequential, starting at U-1. New prefix (not B-/S-/Q-) so this audit doesn't conflict with the existing CODE_REVIEW.md catalog.

### Out of scope

- Fixing any of the findings. After the audit lands, the user decides what to fix in a follow-up spec/plan.
- Code-level audit (lint, type safety, hook internals). That was the previous PR.
- Performance / Lighthouse / accessibility. Different audit; not the ask.
- New tests. The existing test suite (189 passing) is not touched.

### Deliverable

A committed markdown file with the findings. The user reads it, picks what to fix, then I create a follow-up fix spec/plan.

## Tech stack

None new. Uses what's already in the repo: `npm run dev`, Playwright MCP server, the existing Playwright in `playwright.config.ts` (for reference, not for spec files).

## Conventions

- Conventional commits. Findings commits: `docs(ux-audit): add U-N title`. The umbrella commit at the end can be `docs(ux-audit): add 2026-06-14 UX walkthrough`.
- Doc style matches the existing `docs/CODE_REVIEW.md` (id, file, code block, repro, observed, expected, hypothesis).
- Findings are written as I find them — not in a single batch at the end — so the user can `git pull` mid-walkthrough and see progress.
