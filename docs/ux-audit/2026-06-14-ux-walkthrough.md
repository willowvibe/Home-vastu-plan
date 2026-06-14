# 2026-06-14 UX Walkthrough — VastuPlan 2D

> **When:** 2026-06-14, post-merge of PR #50 (room-props-and-drag-freeze).
> **Scope:** User-facing UX bugs across the app. Live browser walk-through against `localhost:3001` (local dev).
> **Severity scale:** P0 (broken core flow / data loss / crash) · P1 (degraded UX, fix this sprint) · P2 (cosmetic / edge case) · P3 (nit).
> **Bug ID prefix:** `U-N` (sequential; new prefix for this audit).
> **Spec:** `docs/superpowers/specs/2026-06-14-ux-walkthrough-design.md`.

---

## Findings (in discovery order)

### U-1 — All new rooms spawn at the same position, completely overlapping

**Severity:** P1
**Surface:** canvas, room-add flow
**Discovered during:** Phase 1 — Add room

**Repro:**
1. Open the app, default state, "0th" floor active.
2. Click "Bedroom 12'x12'" in the Add Rooms panel.
3. Click "Kitchen 10'x10'".
4. Click "Living Room 16'x16'".
5. Click "Bathroom 6'x8'".

**Observed:** All four rooms are placed at `left: 60px, top: 60px` in the canvas. They are completely stacked, with only the topmost room (the one last added, currently selected with the blue ring) visible. The other three rooms are hidden behind it. Properties panel shows the most-recently-added room.

**Expected:** Each new room should be placed in a way that makes all rooms visible — either:
- An offset of a few feet on each new room (e.g., `x: left + idx * 0.5, y: top + idx * 0.5`), or
- A new room appears at the canvas center, or
- The user is alerted "you already have a room here" and prompted to drag.

**Hypothesis:** The `addRoom` handler in `App.tsx` places new rooms at the setback origin (`x: plan.setbacks.left, y: plan.setbacks.top`) every time, with no offset for existing rooms at that position. The user has to drag each room out manually, but with everything stacked they can't see what they're dragging.

**Repro-able every time** (4 rooms, 0 visible behind the top one).

---
