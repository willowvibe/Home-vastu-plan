# Room Properties & Drag Freeze — Design

**Date:** 2026-06-14
**Status:** Approved (pending user review of this spec)
**Scope:** Diagnose and fix two user-reported symptoms (room properties not showing, room movement freezing) and the broader selection / drag / properties-panel lifecycle bugs the audit surfaced alongside them. One branch (`fix/room-props-and-drag-freeze`), one PR, off `origin/main`.
**Out of scope (deferred to a follow-up "deep test mechanism" spec):** property-based / fuzzing tests, expanded Playwright E2E coverage, `S-1` (`App.tsx` split).

---

## 1. Context

### 1a. What the user reported

The user said:

> "found some bugs in the app after adding the rooms sometimes it doesnot show room properties and some times rooms movement freezes. not sure of other possible issues. we need a deep test mechanism and bugs, edge case to be pulled out and resolved."

In follow-up the user confirmed:
- "Properties don't show after adding several rooms" matches what they're seeing.
- They are not certain whether it's local dev or Vercel preview.
- They are open to the audit finding more bugs in the same area.
- They prefer **Sequential: bug-fix first, then test mechanism** — so the deep test mechanism (property tests, E2E expansion, fuzzing) is a *follow-up* spec. This spec produces the targeted regression tests that the deep mechanism will build on.

### 1b. Audit findings (what's actually in the code)

Reading `src/App.tsx`, `src/components/Canvas.tsx`, `src/components/Room.tsx`, `src/components/RoomElement.tsx`, and `src/hooks/useCanvasDrag.ts` produced the following hypotheses. Each is a real, code-level candidate; some are likely root causes, some are adjacent bugs the audit found.

#### Reported symptom: "Room properties don't show"

| # | Location | What's wrong | Likely? |
|---|----------|--------------|---------|
| P1 | `App.tsx:1276` | Right sidebar gets `opacity-50 pointer-events-none` whenever `appMode !== 'edit'`. If `appMode` is `'view'` or `'comment'`, the panel exists in the DOM but is dimmed and unclickable. The user reads "nothing happens" when they click. | **High** — `appMode` toggling is a documented concern; B-5 in CODE_REVIEW is about view-mode lockout but doesn't fix the properties panel's silent disable. |
| P2 | `App.tsx:1339` | `plan.rooms.find((r) => r.id === selectedRoomIds[0])` returns `undefined` if the room was deleted, the id is stale (undo/redo, shared-link load, export race), or `plan.rooms` hasn't been populated yet. The `if (!room) return null` guard at line 1340 silently renders an empty panel — no error, no warning, just blank space below the panel header. | **High** — multiple code paths can produce a stale `selectedRoomIds` entry; none of them clear it. |
| P3 | `App.tsx:430-432` | `handleExport` clears `selectedRoomIds` and restores them after a 50 ms `setTimeout`. The restore path is a 50 ms race — if the user clicks a room during the wait, or the wait is interrupted by a React commit, the restored id may not match. | Medium — known fragile pattern (S-10 in the same area). |
| P4 | `App.tsx:97` | `mobileTab` starts as `'canvas'` and never auto-switches to `'properties'` on selection. On a mobile viewport the user has to manually switch tabs every time. The panel "doesn't show" because the right column is hidden behind `md:flex` and the mobile tab is on `'canvas'`. | Medium — UX, not a code bug, but a real source of confusion. |

#### Reported symptom: "Room movement freezes"

| # | Location | What's wrong | Likely? |
|---|----------|--------------|---------|
| D1 | `useCanvasDrag.ts:382-389` | The global `pointermove` / `pointerup` listeners attach only when `draggingRoom \|\| resizingRoom \|\| draggingElement` is truthy, and detach when all three are null. **No `pointercancel` handler.** If the OS swallows the `pointerup` (release outside the window, palm rejection, browser context-loss), the state stays set. The effect keeps the listener attached *forever*. The next `pointerdown` calls `handlePointerDown` which sets a *new* `dragOffset` based on the new pointer position, so the drag usually self-heals — but if the user does anything that touches `handlePointerMove` before that next `pointerdown` (e.g., a second drag using the now-stale listener), the room can jump or appear to freeze. | **High** — the standard React/DOM pitfall of relying on `pointerup` for cleanup without `pointercancel`. |
| D2 | `useCanvasDrag.ts:169` | `handlePointerMove` early-returns on `if (!canvasRef.current) return;`. The canvas ref can become null mid-drag if the layout reflows (mobile tab switch, sidebar collapse, `Onboarding` modal mount, etc.). The state stays set; the listener stays attached; the next `pointermove` finds the ref still null and bails again. The room "stops" responding to the cursor. **This is the most likely "freeze" cause.** | **High** — the canvas ref is owned by `Canvas.tsx`, but the drag state is owned by `useCanvasDrag`. There's no signaling between them. |
| D3 | `useCanvasDrag.ts:370-380` (and useEffects at 101-114) | No `blur` or `visibilitychange` cleanup. If the user switches tabs or the window loses focus mid-drag, the drag state stays set until the user returns. When they do return, the next `pointermove` uses a stale `dragOffset` and the room teleports. | Medium — `blur` cleanup is the standard fix and is missing. |
| D4 | `Room.tsx:125` | The outer div has `onPointerDown={(e) => onPointerDown(e, room, 'drag')}` unconditionally. Resize handles (lines 156, 160, 164, 168) also call `onPointerDown` with `type: 'resize'`. **React fires the outer onPointerDown first, with `e.target` set to the handle element, then the handle's own onPointerDown.** Two state updates queue; in practice React batches, so the final state is the resize, but the `dragOffset` is *also* set with `type: 'drag'` semantics. When `handlePointerMove` runs, both `draggingRoom` and `resizingRoom` are set briefly; the first branch (drag) wins. Then the resize branch overwrites. Wasteful, can flicker, and may cause the room to move by a fraction of a pixel even though the user clicked a handle. | Medium — this is the on-the-books B-20 from CODE_REVIEW (documented, not fixed). |
| D5 | `useCanvasDrag.ts:382` | The effect's dep array includes `draggingRoom`, `resizingRoom`, `draggingElement`. Every time *any* of these flips, the effect tears down and re-attaches the listener. With React 19 strict mode in dev, the effect runs twice (mount, unmount, remount) — the second remount may miss the original `pointerdown` if it was on a synthetic React event. | Low — dev-only, but worth pinning with a test. |

#### Adjacent bugs the audit found

| # | Location | What's wrong |
|---|----------|--------------|
| A1 | `Canvas.tsx:90-105` | The canvas's `onPointerDown` calls `onSelectRoom(null)` on every click (when not holding shift) and reads `setMeasureStart`/`setMeasureEnd` for the ruler. `Room` calls `e.stopPropagation()` inside `useCanvasDrag.handlePointerDown`, so the canvas's handler should not fire when clicking a room. But the canvas's handler *also* fires for clicks on canvas-buttons and overlays. Worth a regression test that clicks each top-level region and asserts the right `onSelectRoom` call. |
| A2 | `Canvas.tsx:51-58` | The measurement-reset effect clears `measureStart` and `measureEnd` *only* when `measuring` toggles to `true`. The S-11 CODE_REVIEW row documents this as dead reset; the fix is to move the reset into the toolbar's button onClick. Out of scope for this spec; the `Canvas.test.tsx` (if it existed) would catch it. |
| A3 | `App.tsx:175-187` | `handleSelectRoom` is a `useCallback` with `[]` deps. The function reads `setSelectedRoomIds` (stable) but does not depend on any external state. The empty dep array is correct. **However**, the function is inlined into `Canvas` as `onSelectRoom`. If `App` ever changes such that `handleSelectRoom` reads external state, the empty deps become a stale-closure bug. Worth a test that pins the deps as `[]` (or extract to a hook — see Unit 4 in §2). |

### 1c. Cross-cutting constraints

- **No new dependencies.** Everything is built from existing React 19 + `useState` + `useEffect` + DOM event APIs.
- **Tailwind v4 only.** Use the `dark:` variant for any new theming; do not reintroduce the `darkMode ? X : Y` ternary pattern (the post-deploy-polish spec just deleted 53 of those).
- **TypeScript strict.** No new `any`. The lint rule `no-explicit-any` is `warn`; if this spec needs to use `any` it must include a comment justifying it.
- **Tests with change.** Every behavioural change is covered by a new test. No source-only PRs.
- **One branch, one PR.** The spec is approved as Approach B (audit the surrounding code) — not the minimal fix. The fix is bigger but the regression tests cover the whole chain, and the next spec ("deep test mechanism") builds on top.
- **Do not touch `App.tsx` outside the areas this spec calls out.** The full split is `S-1` and is a separate branch.

---

## 2. What changes

### Unit 1 — `useCanvasDrag` (modified)

| File | Change |
|---|---|
| `src/hooks/useCanvasDrag.ts` | Add `pointercancel`, `blur`, `visibilitychange` listeners that all call a new `endDrag()` helper. `pointerup` is rewritten to call `endDrag()`. `endDrag` is idempotent and exported. `handlePointerMove` re-checks `canvasRef.current`; if null for two consecutive moves, it calls `endDrag()` defensively. The `pointerup` listener is also added when the ref becomes null (defensive). |

**Why this shape:** the cleanup paths for a drag should converge. Today there are 1 (pointerup) and we want 4 (pointerup, pointercancel, blur, visibilitychange). One helper, four callers.

**No new exports from the hook's public return.** The hook still returns `{ draggingRoom, resizingRoom, resizeHandle, draggingElement, handlePointerDown, handleElementPointerDown }`. `endDrag` is exported as a named function (not a hook) for tests.

### Unit 2 — `Room` (modified)

| File | Change |
|---|---|
| `src/components/Room.tsx` | Wrap the outer div's `onPointerDown` so it bails when `e.target !== e.currentTarget`. This is the B-20 fix from CODE_REVIEW (documented, not yet shipped). Resize handles no longer fire the drag branch. The room's drag handler fires only when the user clicks the room body, not a handle. |

**Why this shape:** the resize handles already have their own `onPointerDown` with `type: 'resize'`. The outer-div drag branch was a vestigial guard that fires for every child click. Bailing on `e.target !== e.currentTarget` is the minimal correct fix; a wider refactor (e.g., moving the drag handler into a non-handle child) is out of scope.

### Unit 3 — `RoomPropertiesPanel` (new) + `App.tsx` (modified)

| File | Change |
|---|---|
| `src/components/Properties/RoomPropertiesPanel.tsx` | **New.** Renders the right sidebar's "Room Properties" / "N Rooms Selected" block. Props: `{ selectedRoomIds, plan, appMode, onUpdateRoom, onCommitHistory, onDuplicate, onRotate, onDelete, onStaleSelection, onClearSelection }`. Renders the empty state when `selectedRoomIds[0]` no longer resolves to a room in `plan.rooms`; calls `onStaleSelection` in that case. The mobile-tab auto-switch is owned by `App.tsx` (see below), not by the panel. |
| `src/components/Properties/RoomPropertiesPanel.test.tsx` | **New.** ~10 tests: renders single room properties, renders N-selected header, empty state + `onStaleSelection` callback, `appMode !== 'edit'` shows lockout banner, `onUpdateRoom` is wired to the width/height inputs, `onCommitHistory` fires on `onBlur`. |
| `src/App.tsx` (lines 1276-1480 approx.) | **Edit.** Replace the inline right-sidebar JSX with `<RoomPropertiesPanel ... />`. Add an `useEffect` that watches `selectedRoomIds` and the mobile viewport (via `window.matchMedia('(max-width: 768px)')`) and switches `mobileTab` to `'properties'` when a room is selected on mobile. Use `matchMedia` rather than reading `window.innerWidth` so the effect doesn't re-fire on every resize event. |
| `src/App.tsx` (lines 430-442) | **Edit.** Extract the export-with-clear-selection dance to a new `src/hooks/useExportWithClearSelection.ts` hook that uses `requestAnimationFrame` instead of `setTimeout` for the restore, and calls `onStaleSelection`-style cleanup if the room disappears between clear and restore. |
| `src/hooks/useExportWithClearSelection.test.ts` | **New.** ~4 tests: rAF restore happens on the next frame, restored id matches, unmount during export is safe, missing room during restore calls the stale callback. |
| `src/hooks/useSelection.ts` (new) | **New.** A tiny hook that owns the `selectedRoomIds` state and exposes a `select(roomId, isShiftKey)` reducer. The reducer logic is the same as `App.tsx:175-187`, but moved out for testability. `App.tsx` consumes `useSelection` instead of inlining the state. |
| `src/hooks/useSelection.test.ts` | **New.** ~6 tests: single click replaces, shift+click adds, shift+click on already-selected removes, click on null deselects without shift, shift+click on null is a no-op, two rapid clicks without shift end with the latest selected. |

**Why this shape:** the properties-panel render is currently 200+ lines of inline JSX in `App.tsx`. Extracting it gives us a unit-testable component and is the first step of the future `S-1` `App.tsx` split. The `useSelection` extraction is the same idea applied to a piece of state. The `useExportWithClearSelection` extraction targets a known-fragile pattern (50ms setTimeout).

**What this unit does NOT do:** it does not redesign the properties panel UI. It does not move the AI / Vastu analysis panel (which lives in the same right sidebar but above the properties block; that stays inline in `App.tsx` for now).

### Unit 4 — Tests (new + extended)

| File | Action | New tests |
|---|---|---|
| `src/hooks/useCanvasDrag.test.ts` | **extend** | `pointercancel` resets state and calls `onUpdateRoomEnd`; `blur` resets state; `visibilitychange` resets state; `endDrag` is idempotent; `canvasRef.current` becoming null for two consecutive `pointermove`s triggers `endDrag`; pointer-up after ref-null re-attaches and continues. ~10 new tests. |
| `src/components/Room.test.tsx` | **extend** | Resize handle click does NOT fire the outer drag handler (target !== currentTarget guard); room-body click does fire it. ~2 new tests. |
| `src/components/Properties/RoomPropertiesPanel.test.tsx` | **new** | 12 tests as above. |
| `src/hooks/useExportWithClearSelection.test.ts` | **new** | 4 tests as above. |
| `src/hooks/useSelection.test.ts` | **new** | 6 tests as above. |

**Total: ~32 new tests.** Current test count is 159. After this spec: ~191.

**Coverage threshold:** the `vitest.config.ts` thresholds (Q-5) are set to `lines: 17, functions: 10, branches: 12, statements: 16`. The new tests will push measured coverage up by ~5 percentage points across all four metrics. Tightening the thresholds is a follow-up to the "deep test mechanism" spec, not this one.

### Unit 5 — Manual test script (new)

| File | Change |
|---|---|
| `docs/manual-tests/room-props-and-drag.md` | **New.** A 5-minute checklist the user can run against a Vercel preview after merge. Covers: add 3+ rooms, click each in order, switch floors, drag a room to the edge, drag past the canvas boundary, release the mouse outside the window, undo after a drag, redo, change appMode to view/comment, take a phone-screenshot mobile-tab test. |

**Why this shape:** the regression tests cover the deterministic paths. The "missed `pointerup`" path is browser-OS-specific and cannot be reproduced in jsdom reliably. A manual test script is the right artifact for it.

### What does not change

- `src/components/Canvas.tsx`'s `onPointerDown` deselect path. It's correct as written.
- `src/components/Canvas.tsx`'s measurement-reset effect (S-11). Out of scope; `App.tsx` reads `Canvas`'s `measuring` state via the existing `setMeasuring` prop.
- The Vastu / AI analysis panel in the right sidebar. Stays inline in `App.tsx`.
- `useFloorPlan` history behaviour. Already tested; not the source of these symptoms.
- The `useCollaboration` hook. Already tested; collab round-trips do not affect selection.

---

## 3. Data flow

### Selection lifecycle (fixed)

```
User clicks room body
  → Room.onPointerDown(e, room, 'drag')
    → e.target === e.currentTarget (room body) → handler runs
    → useSelection.select(room.id, e.shiftKey)
      → reducer: replaces or appends → setSelectedRoomIds
    → useCanvasDrag.handlePointerDown
      → setDraggingRoom, setDragOffset
    → React schedules effect: attach window pointermove/pointerup/cancel/blur/visibilitychange

User clicks resize handle
  → Handle's onPointerDown fires
    → e.target !== e.currentTarget on the room div → outer handler bails (NEW)
    → handle's onPointerDown runs: setResizingRoom, setResizeHandle
    → React schedules effect: attach window listeners (same as drag)

User releases / cancels / switches window
  → endDrag() runs
    → setDraggingRoom(null), setResizingRoom(null), setDraggingElement(null)
    → call onUpdateRoomEnd (commit history)
    → React schedules effect: detach listeners

Mid-drag if canvasRef.current is null
  → handlePointerMove: bail; record null-tick
  → handlePointerMove on the next call: if still null and null-tick is 2, call endDrag() defensively (NEW)
```

### Properties panel lifecycle (fixed)

```
useSelection.selectedRoomIds changes
  → App's mobile-tab useEffect: if matchMedia mobile and a room is selected, set mobileTab='properties'
  → <RoomPropertiesPanel> renders
    → finds room by id; if missing, calls onStaleSelection → useSelection.clear()
    → if appMode !== 'edit', renders lockout banner (UX, not a disable)
```

### Export selection restore (fixed)

```
User clicks Export
  → useExportWithClearSelection: setSelectedRoomIds([])
  → wait one requestAnimationFrame (instead of 50ms setTimeout)
  → await exportToPNG(...)
  → requestAnimationFrame: if room still exists, setSelectedRoomIds([originalId])
    → if room is missing (e.g., user deleted it during the export), call onStaleSelection
  → finally: restore or clear
```

---

## 4. Error handling

| Scenario | Behavior | Tested? |
|----------|----------|---------|
| `pointerup` missed (release outside window) | `pointercancel` fires (browsers fire this on context loss) → `endDrag()` runs → state cleared | Unit test on `pointercancel` |
| Window loses focus mid-drag | `blur` listener calls `endDrag()` | Unit test on `blur` |
| Tab becomes hidden mid-drag | `visibilitychange` listener calls `endDrag()` | Unit test on `visibilitychange` |
| Canvas ref becomes null mid-drag (layout reflow) | `handlePointerMove` bails; 2-tick null-streak calls `endDrag()` | Unit test on ref-null |
| `selectedRoomIds` contains a stale id (undo, shared-link load, export race) | `<RoomPropertiesPanel>` empty-state calls `onStaleSelection` → `useSelection.clear()` | Unit test on empty state |
| Mobile user on `mobileTab='canvas'` when room is selected | `useEffect` switches `mobileTab` to `'properties'` | Unit test on `useEffect` + manual script |
| Export race: user deletes selected room between clear and restore | `useExportWithClearSelection` detects missing room, calls stale callback | Unit test on race |
| Resize handle click fires drag branch (B-20) | `Room` outer onPointerDown bails on `e.target !== e.currentTarget` | Unit test on guard |
| Click on canvas overlay (Compass, VastuGrid, RulerOverlay) fires selection | Canvas's `onPointerDown` calls `onSelectRoom(null)`; behaviour unchanged | Existing tests + new test pins the call |

---

## 5. Testing strategy

| Layer | Tool | Coverage |
|-------|------|----------|
| Hook unit tests | `vitest` + `vi.fn()` (existing pattern) | `useCanvasDrag` lifecycle paths, `useSelection` reducer, `useExportWithClearSelection` rAF + restore |
| Component unit tests | `@testing-library/react` + `fireEvent` (existing pattern) | `<Room>` resize-handle guard, `<RoomPropertiesPanel>` empty state + lockout banner + onStaleSelection callback |
| Manual E2E | Vercel preview + `docs/manual-tests/room-props-and-drag.md` | Browser-OS-specific paths (release outside window, blur, tab hide) |

**Test files added:** 3 (`.test.ts` × 2, `.test.tsx` × 1).
**Test files extended:** 2 (`.test.ts` × 1, `.test.tsx` × 1).
**Total new tests:** ~32.
**New total:** ~191 (from 159).

**What we explicitly do NOT add in this spec:**
- Playwright E2E tests (the existing 8-test suite stays as-is; the manual script replaces what a Playwright test would do).
- Property-based / fuzzing tests (the next spec).
- Visual regression tests.

**What does "done" look like?**
- `npm run lint` → 0 new errors, ≤ the current warning count.
- `npm test -- --run` → 0 failures, ~193 tests passing.
- `npm run build` → exits 0.
- `npm run test:coverage` → passes the existing threshold (no tightening in this spec).
- The manual test script is committed at `docs/manual-tests/room-props-and-drag.md`.

---

## 6. Rollout

1. Branch off `main` (the user's `fix/post-deploy-polish` is on its own PR track).
2. Land Unit 1 (`useCanvasDrag`) + its tests as commit 1. Green at HEAD.
3. Land Unit 2 (`Room` guard) + its test extension as commit 2. Green at HEAD.
4. Land Unit 3 (`RoomPropertiesPanel` + `useSelection` + `useExportWithClearSelection` + `App.tsx` wiring) as commit 3. Green at HEAD.
5. Land Unit 5 (manual test script) as commit 4. No code change.
6. Push branch, open PR, green CI, merge.
7. Update `docs/CODE_REVIEW.md` §6 (B-20, A1, A2 — add to resolved list), `docs/KNOWN_ISSUES.md` (B-8 stays; this spec does not address it), `CHANGELOG.md` (Unreleased → room properties + drag freeze fixes).
8. Update memory: add a new `room-props-and-drag-freeze-shipped.md` per the existing protocol; update `MEMORY.md` index; add a `docs-sync-2026-06-14.md` to capture the cross-doc updates.

**Branch hygiene:** no force-push, no rewriting of the user's `fix/post-deploy-polish` history, no squashing of the 4 commits (the user has expressed preference for clean per-unit commits in past batches).

**Coordination:** no coordinate-with-admin step (no Vercel config or env-var change). The branch is a pure client change.

---

## 7. What is explicitly out of scope

- **Deep test mechanism** (property-based, fuzzing, expanded E2E) — separate spec, follows after this one.
- **`S-1` split `App.tsx`** — separate spec, much larger; this spec's Unit 3 is a *first* step in that direction, not a substitute.
- **`B-8` shift+click marquee select** — separate spec, design call needed; the user's other report.
- **`B-3`, `B-7`, `B-12`, `B-13`, `S-9`, `S-10`, `S-11`, `S-16`, `S-17`, etc.** — all already resolved or on the resolved-in-X-PR backlog. This spec does not re-litigate them.
- **Vastu matrix property tests (`S-4`)** — separate spec, 4h scope.
- **`vital-pitfalls.md` additions** — the next spec can fold the new "missed `pointerup` → use `pointercancel`" pitfall in once we've validated the fix in production.

---

## 8. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| `pointercancel` fires for normal releases in some browsers | Test against jsdom (which fires pointercancel only when explicitly dispatched) + manual script validates the user-observable behavior. If the real fix is `pointerleave` for the window, that's a small follow-up. |
| `requestAnimationFrame` for the export restore is not faster than `setTimeout(50)` in jsdom | Tests assert that rAF was scheduled; they don't assert wall-clock time. |
| Extracting `RoomPropertiesPanel` changes the visual layout in a way the user dislikes | Visual is unchanged (same JSX, just hoisted). The `appMode !== 'edit'` lockout gets a banner where there was just dimming — this is a *deliberate* UX improvement, called out in the commit. |
| The `useSelection` extraction breaks an existing test that asserts `App.tsx`'s internal state shape | No existing test asserts `App.tsx`'s internal state. The hook-test list in `useSelection.test.ts` pins the new contract. |
| The mobile-tab `useEffect` triggers an infinite loop on `matchMedia` change | `matchMedia` is read once on mount, not subscribed. The effect deps are `[selectedRoomIds, isMobile]`; the latter is set from `matchMedia(...).matches` evaluated once. |
| The `endDrag` defensive call on `canvasRef.current === null` for 2 `pointermove` ticks ends a drag the user wanted to continue | The 2-tick threshold is two `pointermove` events (typically < 16ms apart on a normal mouse). The user can always click again. The alternative — a silent freeze — is worse. |
| Branching off `main` while `fix/post-deploy-polish` is pending causes a merge conflict later | The two branches touch different files (this spec touches `useCanvasDrag`, `Room`, a new `Properties/` dir; the polish branch touches `App.tsx`, `Header.tsx`, `LayerManager.tsx`, the theme files). Conflicts are unlikely; if they happen, they're trivial. |

---

## 9. Open questions

None. The user has approved Approach B (audit the surrounding code), confirmed "Sequential" (bug-fix first, test mechanism later), and confirmed "proceed" on the design.
