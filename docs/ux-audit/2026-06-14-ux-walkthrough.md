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

### U-2 — "Add Rooms" panel is below the fold; you can add a room but not see the canvas

**Severity:** P1
**Surface:** layout, Add Rooms
**Discovered during:** Phase 1 — Add room (after U-1)

**Repro:**
1. Open the app at viewport ~1830×829 (any desktop width 1024+).
2. The left sidebar (288px wide) contains, top to bottom: Plot Settings, Data Management, Floor, Layers, **Add Rooms** (at the very bottom).
3. The canvas is to the right of the left sidebar, occupying the same vertical space.

**Observed:** The left sidebar is ~1755px tall, and the viewport is ~829px tall. To click an "Add Room" button the user must scroll the page (or the left sidebar) down to where the Add Rooms section is. The canvas is in the center column, so scrolling down pushes the canvas out of view. Result: the user clicks "+ Bedroom 12'x12'", the room is added (at position 60,60 per U-1), but the canvas is no longer visible. The user has no visual feedback until they scroll back up. Combined with U-1 (rooms stack invisibly), the new room is doubly hidden.

**Expected:** Either:
- The left sidebar should be sticky / viewport-constrained, with the Add Rooms section near the top (since it's the most-frequent interaction), or
- The Add Rooms section should be in its own panel near the canvas (e.g., a floating "add" toolbar that stays visible while the canvas is in view), or
- The page layout should be reworked so the canvas is always visible when the user is interacting with the Add Rooms.

**Hypothesis:** The left sidebar at `App.tsx` ~line 1230 has `class="w-full md:w-72 flex-col overflow-y-auto shrink-0 ..."`. The `overflow-y-auto` only activates if the parent constrains height — but `main` has `flex-1` and inherits from the body, so the sidebar grows to its full content height (1755px) instead of being constrained to the viewport. The Add Rooms section is at the end of the sidebar's source order, so it lands at the bottom of the column.

**Trace:** Browser dev tools: `main` is `flex-1 flex flex-col md:flex-row overflow-hidden relative` (1814×1755). Left sidebar is 288×1755 (no scroll). Viewport is 1830×829. Add Rooms section is at `y: ~1200` in page coordinates.

---

### U-3 — Clicking a room on the canvas does not select it

**Severity:** P0
**Surface:** canvas, room-add flow, properties panel
**Discovered during:** Phase 1 — Click room (after U-1, U-2)

**Repro:**
1. Open the app, default state, "0th" floor active.
2. Click "Bedroom 12'x12'" in the Add Rooms panel. (A new room is added at `(setback.left, setback.top)` and is auto-selected; the right sidebar shows its properties.)
3. Click on the bedroom in the canvas (or on any of the rooms that follows it).
4. Click again on the canvas at a position that hits a different room.

**Observed:** Rooms are not selectable by clicking. After step 2 the bedroom is selected (the blue ring + 4 resize handles appear). After step 3 the click does nothing — the same room stays selected. The right sidebar still shows the same bedroom's properties. There is no way to select a different room by clicking; the only selectable state is "the most recently added room" until you click on truly empty canvas, which deselects.

Worse: in conjunction with U-1 (rooms stack at the same position), the user has no way to "discover" the rooms they added. The only currently selected room is the most recently added one (a Bedroom in the repro), and clicking on what looks like another room (the Bathroom at a different position) does nothing.

**Expected:** Clicking on a room should:
- If the room is not currently selected: select it (replacing the previous selection unless Shift is held), show the blue ring + 4 resize handles, update the right sidebar to that room's properties.
- If the room is already selected and the click is on its body (not a handle): keep it selected.
- Clicking on a resize handle should resize, not change selection.

**Hypothesis:** `Room.tsx` has no `onSelectRoom` call in its `onPointerDown` handler. Looking at the file:
- `Room.tsx:125-133` — the outer `onPointerDown` only calls the drag handler (`onPointerDown(e, room, 'drag')` if `e.target === e.currentTarget`); it never calls `onSelectRoom(roomId)`.
- `Canvas.tsx:90-91` — the canvas's `onPointerDown` only calls `onSelectRoom(null)` to deselect; it never calls `onSelectRoom(roomId)` for clicks on a room.
- `useCanvasDrag.ts` (entire file) — does not call `onSelectRoom` at all.

So the only path that ever calls `onSelectRoom` with a non-null id is the post-`addRoom` call in `App.tsx:220` (`handleSelectRoom(newRoom.id, false)`). The click-to-select path has been broken since the original `Room` component was introduced (`72b8bfd` "Add Vastu-related components", before PR #50).

**Fix sketch:**
```tsx
// Room.tsx:125
onPointerDown={(e) => {
  if (e.target === e.currentTarget) {
    onSelectRoom?.(room.id, e.shiftKey);  // <-- new
    onPointerDown(e, room, 'drag');
  }
}}
```
And pass `onSelectRoom` from `Canvas.tsx` → `Room.tsx`. (The Canvas already has `onSelectRoom` in its prop interface; the wiring was just never done.)

**Trace:** `document.querySelector('div.cursor-move.ring-blue-500')` shows the latest-added room. After `page.mouse.click(1050, 720)` (on a Bathroom at coordinates `(989, 643) - (1109, 803)`), `document.querySelectorAll('div.cursor-move.ring-blue-500')` returns 0 — the Bathroom did NOT become selected. `page.mouse.click(1100, 300)` (on empty canvas) does deselect (count drops to 0), confirming the deselect path works but the select path doesn't.

**Related:** U-1 (rooms stack invisibly) makes U-3 worse — there's no way to "uncover" the buried rooms since clicking on them doesn't select.

---
