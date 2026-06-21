# P2/P3 UX Batch Design

> **Status:** Approved 2026-06-15.
> **Scope:** All 8 P2/P3 findings from the 2026-06-14 UX walkthrough (`docs/ux-audit/2026-06-14-ux-walkthrough.md`).
> **Branch:** `fix/p2-p3-ux-batch` (off `main`).
> **PR:** 1 PR, 8 commits (one per U-N), ~17 new tests, ~250 prod-code LOC, no new deps.
> **Test count target:** 206 → ~225.

## Per-finding fix

| ID       | Severity | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Tests                                                                                                                                                                               |
| -------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **U-4**  | P3       | (a) Add text labels next to the 3 icon buttons in `RoomPropertiesPanel` ("Duplicate Room", "Rotate 90°", "Delete Room"). (b) Populate the Keyboard Shortcuts help dialog with the actual key bindings (`R` rotate, `Ctrl+D` duplicate, `Del`/`Backspace` delete, `Ctrl+Z`/`Ctrl+Y` undo/redo, `?` help, `Ctrl++`/`Ctrl+-` zoom, `0` reset zoom).                                                                                                                                                                                                                                             | 1 test asserting the help-dialog DOM contains the 7+ binding strings                                                                                                                |
| **U-7**  | P2       | Rename the toolbar button "PDF Export" → "Presentation Export" (matches the modal title) in `App.tsx`. One string change.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | 0 (DOM text test is brittle; verified manually)                                                                                                                                     |
| **U-8**  | P2       | New `replacePlanPreservingHistory(newPlan)` in `useFloorPlan` — captures the pre-plan, sets the new plan, builds a new history `[prePlan, newPlan]` with index 1. Wire to `handleImportJSON` + `handleClearFloor`. Ctrl+Z reverts; Ctrl+Y re-applies.                                                                                                                                                                                                                                                                                                                                        | 2 tests: (i) helper pushes pre-plan onto history and sets new plan; (ii) wiring — `handleImportJSON` calls it.                                                                      |
| **U-10** | P3       | `App.tsx:471` — `await navigator.clipboard.writeText(url)` inside the existing `try/catch`. New helper `copyToClipboardWithFallback(url): Promise<{ok, method}>` in `src/utils.ts`. On rejection, render the URL in a `<dialog>` with a select-and-copy-textarea as fallback. On total failure, show error toast.                                                                                                                                                                                                                                                                            | 3 tests on the helper: clipboard resolves → `{ok: true, method: 'clipboard'}`; clipboard rejects + fallback succeeds → `{ok: true, method: 'fallback'}`; both fail → `{ok: false}`. |
| **U-11** | P2       | (a) New pure helper `clampRoomToBuildableArea(room, plan): Room` in `src/utils.ts`. Returns a clamped copy: width ≤ buildable width, height ≤ buildable height, x ≥ setbacks.left, y ≥ setbacks.top, x+w ≤ buildable right edge, y+h ≤ buildable bottom edge. (b) Call in `RoomPropertiesPanel` width/height `onChange` and `onBlur`. (c) Call in `useCanvasDrag` resize branch on `pointermove`. (d) Bump the input's `max` from `500` to `Math.max(2, buildableWidth)` and add a `title` tooltip.                                                                                          | 6 tests: under-limit, over-width, over-height, x-shift, y-shift, both-axes over, zero-buildable edge case.                                                                          |
| **U-12** | P3       | In `Canvas.tsx`, when `plan.rooms.filter(r => r.floor === currentFloor).length === 0`, render a centered empty-state `<div>` with text "No rooms on this floor yet. Add a room from the left panel, or switch back to {formatFloor(otherFloor)}." Tailwind: `text-slate-500 dark:text-slate-400 text-sm pointer-events-none select-none`.                                                                                                                                                                                                                                                    | 1 test: Canvas renders the empty-state when no rooms on current floor, hides it when at least one room exists.                                                                      |
| **U-13** | P3       | Floor selector derives its button list from the union of `currentFloor` and the set of floors used in `plan.rooms`, sorted ascending. Plus a "+ Add floor" button (max 10) that adds the next floor. The 3 fixed buttons become N + 1 dynamic.                                                                                                                                                                                                                                                                                                                                               | 1 test: floor button set is exactly `{0, 1, 2}` for a default plan; `{0, 1, 2, 4}` after importing a JSON with a room on floor 4.                                                   |
| **U-15** | P3       | (a) Widen `resizeHandle` type in `useCanvasDrag` from `'se' \| 'sw' \| 'ne' \| 'nw'` to add `'n' \| 's' \| 'e' \| 'w'`. The drag branch's `.includes('e')` etc. checks already work for edges. (b) In `Room.tsx`, add 4 mid-edge handles: visual `w-3 h-3` (12px), hit area `w-5 h-5` (20px), positioned on the 4 edge midpoints. (c) Bump corner handles from `w-3 h-3` (12px) to `w-5 h-5` (20px) visual, with a `w-7 h-7` (28px) transparent hit area. (d) `cursor-ns-resize` on N/S edges, `cursor-ew-resize` on E/W edges, keep `cursor-nwse-resize` / `cursor-nesw-resize` on corners. | 2 tests: 4 corner + 4 edge = 8 handles render when room is selected; edge handles carry the right cursor class.                                                                     |

## Architecture

### New helpers (`src/utils.ts`)

```ts
// U-11: clamp a room to the plan's buildable area (after setbacks).
// Returns a NEW room object — never mutates the input. Width/height
// capped; x/y kept inside [setback.origin, setback.far-edge - clampedDim].
// Zero-buildable is an edge case: returns the original room (a clamped
// room of size 0 is not useful).
export function clampRoomToBuildableArea(
  room: Room,
  plan: {
    plotWidth: number;
    plotHeight: number;
    setbacks: { top: number; right: number; bottom: number; left: number };
  }
): Room;

// U-10: try the async clipboard API; on rejection, fall back to a
// hidden <textarea> + document.execCommand('copy'). On total failure
// (no clipboard, no fallback, both rejected), returns { ok: false }
// so the caller can show an error toast with the URL.
export async function copyToClipboardWithFallback(
  url: string
): Promise<{ ok: true; method: 'clipboard' | 'fallback' } | { ok: false }>;
```

### New hook function (`src/hooks/useFloorPlan.ts`)

```ts
// U-8: replace the current plan but preserve undo history.
// Captures the pre-plan, sets the new plan, builds a new history
// [prePlan, newPlan] with historyIndex = 1. Undo (Ctrl+Z) restores
// the pre-plan; redo (Ctrl+Y) re-applies the new plan. Also persists
// to localStorage via the same code path as resetPlan.
const replacePlanPreservingHistory: (newPlan: FloorPlan) => void;
```

### Type widening (`src/hooks/useCanvasDrag.ts`)

```diff
-  const [resizeHandle, setResizeHandle] = useState<'se' | 'sw' | 'ne' | 'nw' | null>(null);
+  const [resizeHandle, setResizeHandle] = useState<'se' | 'sw' | 'ne' | 'nw' | 'n' | 's' | 'e' | 'w' | null>(null);
```

The drag branch already uses `currentState.resizeHandle.includes('e')` etc., so the new edge directions work without further changes.

### Files touched

- `src/utils.ts` — 2 new helpers + their types
- `src/utils.test.ts` — 9 new tests
- `src/hooks/useFloorPlan.ts` — 1 new function `replacePlanPreservingHistory`
- `src/hooks/useFloorPlan.test.ts` — 2 new tests
- `src/hooks/useCanvasDrag.ts` — type widening (1 line)
- `src/components/Room.tsx` — 4 edge handles + corner size bump
- `src/components/Room.test.tsx` — 2 new tests for the 8-handle render
- `src/components/Canvas.tsx` — empty-state hint (U-12)
- `src/components/Canvas.test.tsx` (or `Room.test.tsx`) — 1 new test for U-12
- `src/components/RoomPropertiesPanel.tsx` — U-4 labels + U-11 input clamp
- `src/components/KeyboardShortcuts.tsx` (or wherever the help dialog lives) — U-4 populate
- `src/App.tsx` — U-7 rename, U-8 wiring, U-10 wiring, U-13 dynamic floor
- `docs/ux-audit/2026-06-14-ux-walkthrough.md` — "Resolution" sections
- `docs/KNOWN_ISSUES.md` — "Recently Resolved" blocks

## Data flow

### U-8 (import + clear undo)

`handleImportJSON` (and `handleClearFloor`) currently calls `resetPlan(newPlan)`, which does:

```ts
setPlan(newPlan);
setHistory([newPlan]);
setHistoryIndex(0);
localStorage.setItem(...);
```

The new `replacePlanPreservingHistory(newPlan)` does the same setup but builds the history from the pre-plan:

```ts
setPlan((currentPlan) => {
  const prePlan = currentPlan;
  setHistory([prePlan, newPlan]);
  setHistoryIndex(1); // point at the new plan
  localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(newPlan));
  return newPlan;
});
```

After import: history = `[preImport, imported]`, index = 1. `Ctrl+Z` → index 0, plan = preImport. `Ctrl+Y` → index 1, plan = imported.

The `setPlan` callback form is required so we capture `currentPlan` (the pre-import plan) inside the same React batch as the history update — avoids the "history is one tick behind" race the existing `commitHistory` works around with `historyRef`.

### U-15 (edge handles)

`Room.tsx` currently renders 4 corner handles. The 4 new edge handles are sibling `<div>`s at the midpoints of the four edges:

- North: `top: -0.375rem; left: 50%; translateX(-50%)`
- South: `bottom: -0.375rem; left: 50%; translateX(-50%)`
- East: `right: -0.375rem; top: 50%; translateY(-50%)`
- West: `left: -0.375rem; top: 50%; translateY(-50%)`

Each fires `onPointerDown(e, room, 'resize', handle)` with the new handle. The drag hook's existing axis-resize math handles them.

The hit area is the outer `<div>` (20px / 28px) and the visual circle is a child (12px / 20px). `e.stopPropagation()` on the inner visual so the resize doesn't get interrupted by selection logic.

## Error handling

- **U-10** (clipboard): helper returns `{ok: false}` when both fail. `handleShare` shows error toast `Couldn't copy the link. Here's the URL: <a href={url}>{url}</a>` — not a misleading success.
- **U-11** (clamp): pure function, no throws. UI side renders the clamped value.
- **U-8** (import undo): if the new plan is invalid (e.g., shape mismatch), the existing reducer validation handles it. No new error path.
- **U-13** (max 10 floors): silent cap. The "+ Add floor" button disappears at 10. The user can still import a JSON with more floors; the buttons render for each used floor. The cap is on the _interactively added_ floors, not the imported ones (and the import still preserves undo via U-8).

## Testing

Per-finding, per-helper:

| Helper / wiring                                | Test file                                                     | New tests         |
| ---------------------------------------------- | ------------------------------------------------------------- | ----------------- |
| `clampRoomToBuildableArea`                     | `utils.test.ts`                                               | 6                 |
| `useCanvasDrag` resize-branch clamp            | `useCanvasDrag.test.ts` (extend existing)                     | 1                 |
| `copyToClipboardWithFallback`                  | `utils.test.ts`                                               | 3                 |
| `replacePlanPreservingHistory`                 | `useFloorPlan.test.ts`                                        | 2                 |
| `useCanvasDrag` 8-direction handle type        | (none — type-only)                                            | 0                 |
| `Room` 8-handle render + cursor classes        | `Room.test.tsx`                                               | 2                 |
| `Canvas` empty-state                           | `Canvas.test.tsx` (or extend `Room.test.tsx`)                 | 1                 |
| `RoomPropertiesPanel` width/height input clamp | `Room.test.tsx` (or wherever the panel is tested)             | 1                 |
| `App` floor-button set                         | `App.test.tsx`                                                | 1                 |
| Keyboard-shortcuts help dialog                 | `App.test.tsx` (or `KeyboardShortcuts.test.tsx` if it exists) | 1                 |
| **Total**                                      |                                                               | **~18 new tests** |

Manual-repro only (no automated test): U-7 (DOM text), U-4 button-label visible text (covered by the help-dialog test).

## Out of scope

- **B-8 marquee select** — residual P1 from PR #51. In `KNOWN_ISSUES.md` P1 table. Not part of this batch.
- **S-1 App.tsx split** — P2, 8-12h. Not part of this batch.
- **S-4 vastu property tests** — P2, 4h. Not part of this batch.
- **U-7 deep UX** (a "Quick PDF" path that bypasses the modal) — out of scope. The audit proposed this as a third option; the user picked the rename, so the modal is still required for all PDF flows.

## Commit discipline

One commit per U-N. 8 commits in the PR. The first commit is the design doc (this file).

## Risk

The diff is multi-area (10+ files), but the per-finding commit structure means `git revert <sha>` cleanly undoes any one of them without touching the others. The test count is bounded (≤17) and the helpers are pure — no new state, no new component, no new dependency.
