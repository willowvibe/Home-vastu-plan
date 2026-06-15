# P1 Batch (5 fixes) — Design

> **For agentic workers:** This is the design doc for the P1 batch on `fix/room-props-and-drag-freeze`. It follows the U-3 / U-6 pattern: one commit per finding, fix + tests + doc updates, on the existing branch (already 2 commits ahead of main with P0 fixes U-3, U-6).
>
> **Branch:** `fix/room-props-and-drag-freeze`
> **Commits planned:** 5 (one per finding)
> **Source of truth for findings:** `docs/ux-audit/2026-06-14-ux-walkthrough.md`
> **Source of truth for "what's next":** `docs/KNOWN_ISSUES.md` §6 triage table

## Findings in scope

| ID | Severity | Title | Surface |
|---|---|---|---|
| U-1 | P1 | All new rooms spawn at the same position, completely overlapping | canvas / `handleAddRoom` |
| U-2 | P1 | "Add Rooms" panel is below the fold; you can add a room but not see the canvas | main layout, left sidebar |
| U-5 | P1 | View / Comment mode is unreachable from the UI | header / `handleShare` |
| U-9 | P1 | "Analyze Floor Plan" silently fails with cryptic alert when API key is not configured | AI sidebar / `gemini.ts` |
| U-14 | P1 | Mobile layout is broken: header lands at the bottom, canvas and sidebar are side-by-side, no tabs | responsive layout, `<main>` grid |

## U-1 — Rooms stack at the same position

**Approach:** Offset each new room by `idx * 0.5` ft from the setback origin. Matches the audit's "fix sketch".

**Why offset (not center, not "alert and prompt"):** The simplest fix that makes all rooms visible. No new state, no UX detour, no new component. After U-1 lands, the user can still drag rooms to their final position; the offset just stops the stack from being completely invisible.

**Why 0.5 ft and not 1 ft or 2 ft:** With the snap-to-grid at 1 ft, a 0.5 ft offset puts each new room on a *non-grid* position, which makes the snap-to-grid the user's intentional next action (drag → snap) and avoids the "four rooms in a perfect grid" looks-fake artifact. The drag hook already supports 0.1 ft sub-grid resolution.

**Files to touch:**
- `src/App.tsx` — `handleAddRoom` (line ~220): add `+ idx * 0.5` to both `x` and `y`. The `idx` is the current count of rooms on the floor.
- `src/App.tsx` (the test target) — export a tiny pure helper if it helps, or just keep the fix inline and test it via the existing App tests. Decision: keep it inline; test via a small wrapper or via the props of a new room.
- `docs/ux-audit/2026-06-14-ux-walkthrough.md` — add a "Resolution" section.
- `docs/KNOWN_ISSUES.md` — add a "Recently Resolved" block.

**Tests:** A small pure helper is easier to test than `App.tsx`. Pattern: extract `computeInitialRoomPosition(plan, floor, idx)` to a tiny module under `src/utils/` or inline as a top-level const in `App.tsx`, then write 3 tests: (1) first room on empty floor → `(setback.left, setback.top)`, (2) 4th room with 3 existing at origin → offset by `1.5` ft, (3) rooms on different floors do not stack (off-by-floor check).

## U-2 — Add Rooms below the fold

**Approach:** Sticky Add Rooms panel. The fix is two parts:
1. Constrain the layout to viewport height so `overflow-y-auto` on the left sidebar actually fires. The audit's trace confirms `main` is `flex-1` and inherits from the body — without a `h-screen` or `h-[100dvh]` on a parent, the sidebar grows to content height.
2. Reorder the Add Rooms section to the top of the left sidebar (or, if reorder is too disruptive, make the section use `flex-col-reverse` to invert the visual order). The audit's trace shows Add Rooms is at `y: ~1200` in page coordinates — the very bottom.

**Why reorder, not move to a new component:** A floating add toolbar is a separate component with new prop wiring. Reordering is a one-line JSX change.

**Decision:** Reorder. Move the `<AddRoomsPanel>` (or whatever the section is called) above `<PlotSettingsPanel>`. Add `min-h-0` to the left sidebar so `overflow-y-auto` activates. (The audit's hypothesis is that the parent doesn't constrain height, so the fix is `h-screen` on the root + `min-h-0` on the flex children — this is the standard "flexbox won't shrink past content" gotcha.)

**Files to touch:**
- `src/App.tsx` — main layout container + left sidebar ordering.
- `docs/ux-audit/2026-06-14-ux-walkthrough.md` — "Resolution" section.
- `docs/KNOWN_ISSUES.md` — "Recently Resolved" block.

**Tests:** App.tsx is hard to unit-test for layout. Skip the unit test. Manual repro is documented in the "Resolution" section.

## U-5 — View / Comment mode unreachable

**Approach:** Convert the single "Share View-Only Link" button into a 2-button group: "Share (View)" and "Share (Comment)". The `handleShare(mode)` handler already supports both — only the wiring is missing.

**Why 2 buttons, not a single dropdown or a separate header button:** The audit's option 2 is the smallest change. No new component, no new state. The existing dropdown menu at the export toolbar (or wherever the Share button lives) is the natural host.

**Files to touch:**
- `src/App.tsx` — find the existing share button; replace it with a small flex row of 2 buttons that call `handleShare('view')` and `handleShare('comment')`.
- `docs/ux-audit/2026-06-14-ux-walkthrough.md` — "Resolution" section.
- `docs/KNOWN_ISSUES.md` — "Recently Resolved" block.

**Tests:** Test that `handleShare` is called with `'view'` and `'comment'` when the respective buttons are clicked. Find the existing share-button test (if any) or add a small App-level test.

## U-9 — Analyze fails without API key

**Approach:** Disable the "Analyze Floor Plan" button when `VITE_GEMINI_API_KEY` is missing. Add a tooltip / `aria-label` explaining how to enable it. Matches the audit's option 1.

**Why disable, not show a better error message:** A disabled button + tooltip is the better UX. The user sees a clear "this is not configured" affordance, not a scary alert. The alert path stays as a fallback for *other* errors (e.g., network), but the no-key case is handled at the UI level.

**Files to touch:**
- `src/App.tsx` — find the Analyze button (line ~1334 per the audit). Add a check for `import.meta.env.VITE_GEMINI_API_KEY`. Disable + tooltip when missing.
- `src/components/AIAnalysisPanel.tsx` (or wherever the button is rendered) — same change if the button is in a child component.
- `src/services/gemini.ts` — leave the throw in place; it's the right behavior, but the button won't trigger it.
- `docs/ux-audit/2026-06-14-ux-walkthrough.md` — "Resolution" section.
- `docs/KNOWN_ISSUES.md` — "Recently Resolved" block.

**Tests:** A small component test: render the panel with `VITE_GEMINI_API_KEY` undefined → button is `disabled`; with key defined → button is enabled. Use `vi.stubEnv('VITE_GEMINI_API_KEY', '')` to set/unset.

## U-14 — Mobile layout

**Approach:** Add a CSS-only mobile tab bar. Three tabs at the bottom of the viewport: Plan (canvas) / Settings (left sidebar) / Properties (right sidebar). Visible only at `<md` (Tailwind's 768px breakpoint). The sidebars become hidden by default on mobile and are shown when their tab is active.

**Why tab bar, not hamburger drawer:** Tabs are the mobile pattern that mobile users expect (Figma, Excalidraw, Procreate, etc.). The audit's option 1 is the cleaner UX.

**Why CSS-only, not a full S-1 split:** Per the user's "Quick mobile tab bar" choice, keep the change scoped. S-1 (App.tsx split into Sidebar / Properties / Toolbar) is its own batch on its own branch.

**Files to touch:**
- `src/App.tsx` — add a small `<MobileTabBar>` JSX block inside the root layout, gated by `<md` (Tailwind). Add state for the active mobile tab. Hide the desktop sidebar/properties panels on `<md` when the tab isn't active.
- `src/components/MobileTabBar.tsx` (new) — small component, ~30-50 lines. Three buttons. The "active" tab gets a different background. Uses `useTheme()` for dark-mode.
- `src/components/MobileTabBar.test.tsx` (new) — 3-4 tests: renders three tabs; click switches active; active tab has the active style; "Plan" is the default.
- `docs/ux-audit/2026-06-14-ux-walkthrough.md` — "Resolution" section.
- `docs/KNOWN_ISSUES.md` — "Recently Resolved" block.

**Tests:** 3-4 unit tests for the new MobileTabBar component. The visual "looks right on 500px" verification is documented in the "Resolution" section as a manual repro.

## Out of scope (deferred)

- **U-4 (P3)** — Rotate button icon-only. The "R" shortcut works, and the audit itself downgraded this to P3. Skip.
- **U-7 (P2)** — "PDF Export" button label misleading. The button is now functional (U-6 fix). Renaming is a copy change; address in a separate UI copy-sweep batch.
- **U-8 (P2)** — Imported JSON plan cannot be undone. Real fix requires wiring `handleImportJSON` to the history hook. Address in a separate undo-system batch.
- **U-10 (P3)** — Share link clipboard write may silently fail. P3. Add `await` + catch in a follow-up.
- **U-11 (P2)** — No boundary check on room resize. Add to a separate input-validation batch.
- **U-12 (P3)** — Empty-floor hint. Cosmetic. Add an empty-state branch in `Canvas.tsx`.
- **U-13 (P3)** — Floor selector fixed at 3. Architectural, not a regression. Skip.
- **U-15 (P3)** — No edge-midpoint resize handles. Polish. Skip.

## Verification

- 195/195 → 200+/200+ tests pass after all 5 commits.
- 0 tsc errors, 0 lint errors, build clean.
- Manual repros documented in each "Resolution" section of the audit.
- `docs/KNOWN_ISSUES.md` updated with 5 new "Recently Resolved" blocks.

## Rollout

This batch stays on `fix/room-props-and-drag-freeze` alongside U-3 and U-6. After all 5 P1 commits land, the branch is ready for PR. P2/P3 follow-up batches (per the audit) are tracked separately in `KNOWN_ISSUES.md` §6.
