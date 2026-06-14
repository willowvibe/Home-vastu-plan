# Room Properties & Drag Freeze — Manual Test Checklist

> **When to run:** after the Vercel preview URL is built off `fix/room-props-and-drag-freeze`. Takes ~5 minutes. All steps assume a desktop browser (Chrome / Firefox / Safari latest).

## Setup

1. Open the Vercel preview URL.
2. Open Chrome DevTools → Console. Watch for errors during the test.
3. Open a second window to `https://google.com` so you can test the blur path.

## Properties panel

- [ ] **P-A. Add 4 rooms of different types.** Use the "Add Rooms" sidebar buttons (Bedroom, Kitchen, Bathroom, Living Room).
  - **Expected:** each room appears on the canvas; the right sidebar is empty.
- [ ] **P-B. Click each room in order.**
  - **Expected:** the right sidebar shows "Room Properties" with the correct room's width / length / wall thickness. The room is outlined in blue on the canvas.
- [ ] **P-C. Shift-click two rooms.**
  - **Expected:** the right sidebar shows "2 Rooms Selected" with action buttons (Clear / Duplicate / Rotate / Delete).
- [ ] **P-D. Click "Clear" (or click empty canvas).**
  - **Expected:** the right sidebar returns to its empty state.
- [ ] **P-E. Select a room, then undo (Ctrl+Z) 3 times to remove it.**
  - **Expected:** the right sidebar's "Room not found" empty state appears, with a "Clear selection" button.
  - **The bug this catches:** before this spec, the panel would silently render blank below the header.
- [ ] **P-F. Toggle appMode to "view" via the header.**
  - **Expected:** the right sidebar shows a yellow banner: "Properties are read-only in view mode. Switch to edit to make changes." The width / length inputs are disabled.
  - **The bug this catches:** P1 — the previous behaviour was a silent `opacity-50 pointer-events-none` with no explanation.

## Drag lifecycle

- [ ] **D-A. Add a room. Drag it to the middle of the plot.**
  - **Expected:** the room follows the cursor. Release the mouse; the room stays put.
- [ ] **D-B. Start dragging a room, then release the mouse outside the browser window (drag the mouse into the OS title bar).**
  - **Expected:** the room snaps to the last in-window position. Drag a different room — it should respond normally.
  - **The bug this catches:** D1 — without `pointercancel`, the previous state was stuck.
- [ ] **D-C. Start dragging a room, then click into the second window (google.com).**
  - **Expected:** the drag ends; the room is at the last in-window position. Drag a different room — it should respond normally.
  - **The bug this catches:** D3 — `blur` cleanup.
- [ ] **D-D. Start dragging a room, then switch to a different browser tab.**
  - **Expected:** same as D-C — drag ends cleanly. The first tab remains responsive when you return.
  - **The bug this catches:** D3 — `visibilitychange` cleanup.
- [ ] **D-E. Resize a room by dragging the SE handle.**
  - **Expected:** only the room's size changes; the room does not also shift position.
  - **The bug this catches:** D4 / B-20 — the previous behaviour set both the drag and resize state, causing a fractional pixel shift.
- [ ] **D-F. Resize a room by dragging the NW handle.**
  - **Expected:** the room resizes from the top-left; the bottom-right corner stays put.

## Mobile / responsive (skip on a small screen)

- [ ] **M-A. Open the Vercel preview on a phone (or DevTools device emulation at 375 × 812).**
- [ ] **M-B. Add a room. Tap the room.**
  - **Expected:** the bottom tab automatically switches to "Properties" and shows the room's data.
  - **The bug this catches:** P4 — without the auto-switch, the user sees the canvas and wonders why "nothing happened."

## Export

- [ ] **E-A. Select a room. Click "Export PNG" in the toolbar.**
  - **Expected:** the PNG downloads. The room's selection is restored after the export completes.
- [ ] **E-B. Select a room. Click "Export PNG". During the export, click "Delete" on the selected room.**
  - **Expected:** the export completes. The right sidebar shows "Room not found" with a "Clear selection" button.
  - **The bug this catches:** P3 — without `isRoomStillPresent`, the previous code restored a stale id.

## Sign-off

If all checkboxes pass, leave a comment on the PR: "Manual tests pass on Vercel preview."
If any fail, copy the failing step's expected vs. actual into a PR comment.
