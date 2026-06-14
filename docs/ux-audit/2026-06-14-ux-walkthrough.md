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

### U-4 — Rotate button exists but is icon-only and the keyboard shortcut is undocumented

**Severity:** P3
**Surface:** room properties, keyboard shortcuts help dialog
**Discovered during:** Phase 1 — Rotate room (re-tested after second look)

**Repro:**
1. Open the app. Add a room. The new room is auto-selected.
2. Look at the right sidebar — "Room Properties" panel header has a row of 3 icon-only buttons: "Duplicate Room", "Rotate 90°", "Delete Room".
3. Open the Keyboard Shortcuts help dialog (header → ? button).

**Observed:** The rotate button is a small icon button with no text label and only a `title="Rotate 90°"` tooltip. Users who don't hover will not know what it does. The Keyboard Shortcuts help dialog shows four empty categories (Navigation, Room Management, View Controls, Export) — `R` for rotate, `Ctrl+D` for duplicate, `Delete`/`Backspace` for delete, `Ctrl+Z`/`Ctrl+Y` for undo/redo, `?` for help, `Ctrl++`/`Ctrl+-` for zoom — none are listed.

**Expected:** Either:
- Add text labels next to the icon buttons (Duplicate Room / Rotate 90° / Delete Room) so users can read the function, or
- Populate the Keyboard Shortcuts help dialog with the actual key bindings so users can discover them.

**Hypothesis:** `RoomPropertiesPanel` renders the action buttons as `<button title="Rotate 90°">` with an SVG inside and no `<span>` label. The keyboard shortcuts help dialog is rendered in `App.tsx` with empty placeholder sections.

**Trace:** `Array.from(document.querySelectorAll('button')).filter(b => /rot/i.test(b.innerHTML))` returns `<button class="p-1.5 ..." title="Rotate 90°"><svg ...>`. There is a button, it's just not labeled.

**Verified working:** Pressing `R` on a selected room does rotate it — the room's `width` and `height` swap (e.g., 480×320 → 320×480 for a 12×16 room). Clicking the icon button also rotates.

**Downgraded from initial P2 to P3:** the button exists and has a `title` attribute, so it's discoverable on hover. The main discoverability gap is the empty help dialog.

---

### U-5 — View / Comment mode is unreachable from the UI

**Severity:** P1
**Surface:** header, appMode state, sharing
**Discovered during:** Phase 1 — Mode switch

**Repro:**
1. Open the app, default state.
2. Look at the header (the top bar with the VastuPlan logo, "Vastu Score", dark-mode toggle, Keyboard Shortcuts button, Projects / Floor Plan / AI Image Editor tabs).
3. Look at the rest of the UI for any "View", "Edit", "Comment" toggle.

**Observed:** No mode switcher exists in the UI. The only way to enter View or Comment mode is to load a shared URL with `?mode=view` or `?mode=comment` query parameter (the share-link loader at `App.tsx:158-174` calls `setAppMode(mode)`). Once you're in View mode via a shared link, an "Edit Copy" button appears in the header (Header.tsx:78-83) — but that only works to *exit* view mode; it doesn't help you *enter* it in the first place.

The `handleShare` function in `App.tsx:468` accepts a `mode: 'view' | 'comment'` argument, but only `handleShare('view')` is wired to a button (line 1191). `handleShare('comment')` is defined but never called from the UI.

**Expected:** Either:
- A "Share" / "View Mode" button in the header that toggles into a read-only preview of the current plan, or
- A two-button group in the canvas toolbar: "Share (View)" and "Share (Comment)", so the user can generate both types of share links, or
- At minimum, a "Preview as View-Only" link that opens the current plan in a new tab in view mode.

**Hypothesis:** Looking at `Header.tsx:71-86`, the entire "VIEW MODE" indicator block is wrapped in `{appMode !== 'edit' && (...)}`, which is the *only* place `appMode` shows up in the header. There is no input that ever sets `appMode` to a non-edit value (other than the URL loader). The app was designed with sharing in mind, but the affordance for *generating* a shareable link is only the Share View-Only button — the user can share a view-only link but cannot easily experience the view mode themselves.

**Trace:** `Array.from(document.querySelectorAll('button')).filter(b => b.textContent?.match(/view|edit|comment/i))` returns only "AI Image Editor" (a false-positive substring match). The header has 5 buttons (dark toggle, keyboard shortcuts, Projects, Floor Plan, AI Image Editor) and 1 dropdown — none of them set `appMode`.

---

### U-6 — PDF Export always fails with cryptic "Failed to export PDF" alert

**Severity:** P0
**Surface:** export toolbar, "PDF Export" button
**Discovered during:** Phase 2 — PDF Export

**Repro:**
1. Add at least one room to the floor (e.g., Bedroom 12'x12').
2. Click "PDF Export" in the toolbar.
3. Presentation Export modal opens. Fill in Project Name / Client Name / Consultant Name.
4. Click "Generate PDF" (with or without a logo — the bug is independent of the logo).

**Observed:** A native `alert()` pops up: `Failed to export PDF.` The modal stays open but does nothing useful. No PDF is downloaded. The alert is the only feedback. After dismissing it, the modal is still there — clicking "Generate PDF" again produces the same alert.

**Expected:** Either the PDF downloads successfully (the user has done everything the modal asks for), or the user gets a specific, actionable error message like "Could not capture canvas: the canvas is empty or hidden" — not a generic "Failed".

**Hypothesis:** `PresentationExport.tsx:131-132` catches an exception from `jsPDF.addImage()` and shows a generic alert. The real error in the console is:

```
[error] PDF Export failed: Error: addImage does not support files of type 'UNKNOWN',
       please ensure that a plugin for 'UNKNOWN' support is added.
```

The `'UNKNOWN'` is `imgData` — the result of `toPng(canvasRef.current, ...)` at line 71. `toPng()` returns an empty/invalid data URL because the canvas being captured is the **hidden print-only canvas**, not the visible one. The root cause: `App.tsx:1248` and `App.tsx:1276` both assign `ref={canvasContainerRef}` to different `<div>` elements. React's ref collides — the second mount wins, and that div is wrapped in `class="hidden print-area print:block"`, which makes it `display: none` outside print mode. `toPng()` on a `display: none` element returns nothing useful.

**Trace:** `Array.from(document.querySelectorAll('[ref]'))` (or reading `canvasContainerRef.current` via the React fiber) shows the ref points to a `<div class="print-only">` ancestor. That div is inside `<div class="hidden print-area print:block">`, so its bounding box is 0×0. After clicking "Generate PDF", console shows the addImage error and the alert fires.

**Related:** U-7 (the button label is misleading). U-6 is the actual broken behavior; U-7 is the discoverability gap that hides it.

---

### U-7 — "PDF Export" button label is misleading; opens a "Presentation Export" modal

**Severity:** P2
**Surface:** export toolbar, button copy
**Discovered during:** Phase 2 — PDF Export (after U-6)

**Repro:**
1. Open the app. Look at the toolbar buttons in the bottom-right of the canvas.
2. Read the button label: "PDF Export".
3. Click it.

**Observed:** The button opens a **modal titled "Presentation Export"** (not "PDF Export") with form fields for Project Name / Client Name / Consultant / Logo. The user expected a PDF; they got a presentation builder. A user who just wants a quick PDF of the floor plan has to fill in three text fields they may not care about before the export runs.

**Expected:** Either:
- Rename the button to "Presentation Export" so the label matches what opens, OR
- Have a plain "PDF Export" that immediately generates a PDF with sensible defaults (project name = "Untitled", client = "N/A") and a separate "Customize Presentation…" path, OR
- Add a "Skip — use defaults" link in the modal for users who don't want to fill in anything.

**Hypothesis:** The button label in `App.tsx` says "PDF Export" but the component it renders is `<PresentationExport>` (line 1407-1414), which is a richer client-facing document with title block + logo. The mismatch predates the audit (introduced when the component was first added).

**Trace:** Toolbar text shows "PDF Export". The modal header text shows "Presentation Export". Two different product names for the same flow.

**Related:** U-6 (the same flow is broken end-to-end).

---

### U-8 — Imported JSON plan cannot be undone

**Severity:** P2
**Surface:** Data Management, undo/redo
**Discovered during:** Phase 2 — JSON import roundtrip

**Repro:**
1. Clear the floor. Verify the "Undo" button is disabled.
2. Import a JSON file with rooms (via "Import JSON" → file picker).
3. Rooms appear on the canvas. The success alert reads "Floor plan imported successfully!".
4. Look at the "Undo" button.

**Observed:** The "Undo" button is **disabled** even though the plan changed substantially (0 rooms → 2 rooms). Pressing Ctrl+Z does nothing. The user cannot undo a wrong-file import. If they import the wrong JSON, they have to:
- Manually delete each room, OR
- Click "Clear Floor" (which is also not undoable), losing everything.

**Expected:** Importing a plan should push the previous plan to the undo stack so the user can revert with Ctrl+Z. At minimum, importing should warn "This will replace your current floor. Continue?" when the canvas has rooms — but the import is silent.

**Hypothesis:** `App.tsx:491-516` (`handleImportJSON`) calls `resetPlan(result.plan)` and shows an alert. It does **not** call `commitHistory()` or push to the undo stack. The `resetPlan` reducer replaces the plan state, but the history (managed separately by the history hook) is not updated. Same applies to `Clear Floor` — it's not undoable.

**Trace:** Before import: `Undo (Ctrl+Z) disabled`. After successful import (plan.rooms = 2): `Undo (Ctrl+Z)` still `disabled`. Pressing Ctrl+Z: plan.rooms remains 2.

**Related:** U-1 (rooms stack invisibly) + U-8 (import without undo) compound — a user who imports a plan to "fix" the stacked rooms has no recovery if the import is wrong.

---

### U-9 — "Analyze Floor Plan" button silently fails with cryptic alert when API key is not configured

**Severity:** P1
**Surface:** AI Vastu & Build Guide sidebar
**Discovered during:** Phase 3 — AI analysis

**Repro:**
1. Open a fresh checkout (or any environment without `VITE_GEMINI_API_KEY` set in `.env`).
2. Add at least one room (the "Analyze Floor Plan" button is disabled until you do).
3. Click "Analyze Floor Plan".

**Observed:** A native `alert()` pops up: `Failed to analyze floor plan.` No PDF, no Vastu score panel, no progress indicator — just the alert. Dismissing it leaves the button enabled (so the user can click it again and get the same alert). The right sidebar's Vastu Score (visible in the header: "40/100") is a *static* placeholder, not a result of the analysis.

**Expected:** Either:
- The button should be disabled with a tooltip / hint "Set `VITE_GEMINI_API_KEY` in `.env` to enable AI analysis" when the key is missing, OR
- The failure should show a useful error like "AI analysis is not configured. Add `VITE_GEMINI_API_KEY=...` to your `.env` file. See `.env.example`."

**Hypothesis:** `App.tsx:1334-1338` disables the button only on `isAnalyzing || no rooms on floor`. It does **not** check whether `VITE_GEMINI_API_KEY` is set. `gemini.ts:18` throws `'VITE_GEMINI_API_KEY not configured. Set it in your .env file (see .env.example).'` on the first call. The catch at `App.tsx:436` swallows that message and replaces it with a generic `'Failed to analyze floor plan.'`.

**Trace:** Console error: `[error] Error: VITE_GEMINI_API_KEY not configured. Set it in your .env file (see .env.example). (1 args)`. The user-facing alert says only: `Failed to analyze floor plan.`

**Related:** The static "Vastu Score: 40/100" badge in the header looks like a result of the AI analysis but is actually a hardcoded/heuristic score. A new user could believe the AI is already working and the 40/100 is the result.

---

### U-10 — "Share View-Only Link" can claim success even when the clipboard write silently fails

**Severity:** P3
**Surface:** Share View-Only Link button
**Discovered during:** Phase 2 — Share link (after U-5)

**Repro:**
1. Open the app on a non-secure context (e.g., `http://localhost:3001`) OR deny clipboard permission OR use a browser that blocks clipboard writes.
2. Add a room. Click "Share View-Only Link".

**Observed:** The alert says: `Share link (view mode) copied to clipboard!` — but the clipboard is empty (or the write was rejected). The user has no way to recover the link.

**Expected:** Either:
- `await navigator.clipboard.writeText(url)` and only show the success alert when the promise resolves. If it rejects, show the link in a modal with a "Copy" button as a fallback, OR
- Always show the link in a modal with a "Copy" button (no reliance on the clipboard API).

**Hypothesis:** `App.tsx:471` calls `navigator.clipboard.writeText(url)` without `await` and without `.catch()`. The function returns a Promise. If the browser blocks the write (insecure context, denied permission, focus not on the page, etc.), the promise rejects silently. The success alert at line 475 fires regardless.

**Trace:** `navigator.clipboard.writeText` is a Promise; calling it without await means the success alert fires before the write completes. The `try/catch` at line 469 only catches synchronous errors, not promise rejections.

**Related:** U-5 (the share button only supports "view" mode, not "comment" mode — the underlying handler supports both).
