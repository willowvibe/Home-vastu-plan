# VastuPlan 2D - Bug Fixes and Usability Improvements

## Overview

This document lists all identified bugs and usability improvements for the VastuPlan 2D application.

## Progress Update

> **Note (2026-06-11):** This document is a historical snapshot of the original 30-task list and the "Launch Readiness" production checklist. **It is no longer the source of truth for active work** — see [`docs/KNOWN_ISSUES.md`](./docs/KNOWN_ISSUES.md) and [`docs/CODE_REVIEW.md`](./docs/CODE_REVIEW.md) for the current backlog (P0/P1/P2/P3 items filed during the 2026-06-07 review and after). The original entries below are kept for traceability.

## Progress Update

### Completed Tasks (30/30)

All 30 originally-filed tasks are complete (per `tasks-completed.md`). The list below was the original v2.0 / v2.1 plan; the actual shipped version is `0.1.0` (see `CHANGELOG.md` and `VERSION`).

- ✅ **Task 1**: Room Element Rotation Bounds Constraint - Fixed in `src/components/Canvas.tsx`
- ✅ **Task 2**: Wall Thickness Change Element Positions - Fixed in `src/App.tsx`
- ✅ **Task 3**: Missing GEMINI_API_KEY Validation - Fixed in `src/services/gemini.ts`
- ✅ **Task 4**: Vastu Grid Overlay Rotation - Fixed in `src/components/Canvas.tsx`
- ✅ **Task 5**: Undo/Redo History Bounds - Fixed in `src/App.tsx`
- ✅ **Task 6**: Share Link Not Working in View/Comment Mode - Fixed in `src/App.tsx`
- ✅ **Task 7**: PDF Export Missing Floor Number in Title Block - Fixed in `src/components/PresentationExport.tsx`
- ✅ **Task 8**: No Minimum Maximum Zoom Limits - Fixed in `src/App.tsx`
- ✅ **Task 9**: Input Validation Missing for Plot Dimensions - Fixed in `src/App.tsx`
- ✅ **Task 10**: Keyboard Navigation Not Available - Fixed in `src/App.tsx` and `src/index.css`
- ✅ **Task 11**: Undo Button Not Working for Room Deletion - Fixed in `src/App.tsx`
- ✅ **Task 12**: Element Deletion Does Not Save to History - Already working correctly
- ✅ **Task 13**: No Keyboard Shortcuts for Common Actions - Fixed in `src/App.tsx`
- ✅ **Task 14**: No Clear All for Current Floor - Fixed in `src/App.tsx`
- ✅ **Task 15**: No Element Duplication - Fixed in `src/App.tsx`
- ✅ **Task 17**: No Snap to Grid Toggle - Fixed in `src/App.tsx` and `src/components/Canvas.tsx`
- ✅ **Task 20**: No Print Styles - Fixed in `src/index.css` and `src/App.tsx`
- ✅ **Task 21**: Vastu Zone Explanations Missing - Fixed in `src/components/Canvas.tsx`
- ✅ **Task 22**: No Loading State for AI Analysis - Fixed in `src/App.tsx`

### Modularization Improvements (Post v2.0)

- ✅ **Refactor**: Extracted `Canvas.tsx` monolith into modular components (`Room`, `RoomElement`, `VastuGrid`, `Compass`, `RulerOverlay`, `RoadIndicator`)
- ✅ **Refactor**: Extracted drag logic into `useCanvasDrag` hook
- ✅ **Refactor**: Extracted floor plan state/history into `useFloorPlan` hook
- ✅ **Refactor**: Extracted keyboard shortcuts into `useKeyboardShortcuts` hook
- ✅ **Refactor**: Extracted export utilities into `src/lib/exports.ts`
- ✅ **Fix**: Canvas measurement display bug — measurement result now persists until a new measurement is started
- ✅ **Fix**: Gemini API model names updated to valid identifiers
- ✅ **Fix**: Keyboard shortcuts ignore events when typing in input fields
- ✅ **Fix**: Room vastu analysis memoized with `useMemo` to avoid recalculation on every render

---

The remainder of this file (Tasks 16, 18, 19, 23–30, and the Launch Readiness checklist) is the original v2.0 / v2.1 plan, preserved as a historical record. **For the active backlog, see [`docs/KNOWN_ISSUES.md`](./docs/KNOWN_ISSUES.md).**

---

## Critical Priority (Must Fix)

### 1. Room Element Rotation Breaks Bounds Constraint

**File:** src/components/Canvas.tsx (Lines 245-276)

**Issue:** When rotating an element by double-clicking, the element position is not recalculated to keep it within the room inner walls.

**Fix Required:**

- When rotation changes, recalculate the valid X/Y bounds based on new element dimensions
- Account for swapped width/height when rotated 90 or 270 degrees

**Estimated Effort:** 4 hours

### 2. Wall Thickness Change Does Not Adjust Element Positions

**File:** src/App.tsx (Lines 163-179)

**Issue:** When changing a room wall thickness, elements inside are not repositioned.

**Fix Required:**

- Always recalculate element bounds when wallThickness changes
- Adjust element X/Y coordinates to maintain relative position

**Estimated Effort:** 3 hours

### 3. Missing GEMINI_API_KEY Causes Silent Failure

**File:** src/services/gemini.ts (Lines 3-7)

**Issue:** When GEMINI_API_KEY is not set, the app crashes instead of showing a clear message.

**Fix Required:**

- Add API key check on app load
- Show a modal/info banner if key is missing

**Estimated Effort:** 2 hours

### 4. Vastu Grid Overlay Does Not Rotate with North Angle

**File:** src/components/Canvas.tsx (Lines 55-81)

**Issue:** The Vastu grid is drawn in absolute canvas coordinates and does not rotate when north angle changes.

**Fix Required:**

- Apply SVG transform rotate(-northAngle, cx, cy) to the grid group

**Estimated Effort:** 5 hours

### 5. Undo/Redo History Grows Unbounded

**File:** src/App.tsx (Lines 28-35)

**Issue:** The history array grows indefinitely without limits.

**Fix Required:**

- Implement a maximum history size (e.g., 50 states)

**Estimated Effort:** 2 hours

## High Priority (Should Fix)

### 6. Share Link Not Working in View/Comment Mode

**Issue:** When visiting a shared link with mode=view, the share button still generates a link for view mode.

**Fix Required:** Update handleShare to use current appMode as default

**Estimated Effort:** 2 hours

### 7. PDF Export Missing Floor Number in Title Block

**File:** src/components/PresentationExport.tsx

**Fix Required:** Add floor number display in the PDF title block

**Estimated Effort:** 3 hours

### 8. No Minimum Maximum Zoom Limits

**Issue:** Users can zoom in/out excessively.

**Fix Required:** Add zoom limits (min 0.1, max 3.0)

**Estimated Effort:** 2 hours

### 9. Input Validation Missing for Plot Dimensions

**Issue:** Users can enter negative numbers or zero for plot dimensions.

**Fix Required:** Add min=1 and max values to numeric inputs

**Estimated Effort:** 2 hours

### 10. Keyboard Navigation Not Available

**Issue:** No focus management or skip links for keyboard navigation.

**Fix Required:** Add tabIndex, aria-label, and focus-visible styles

**Estimated Effort:** 4 hours

### 11. Undo Button Not Working for Room Deletion

**Issue:** Deleted rooms do not appear in history for undo.

**Fix Required:** Ensure commitHistory() is called correctly

**Estimated Effort:** 3 hours

### 12. Element Deletion Does Not Save to History

**Issue:** Deleting elements via the trash icon does not save to undo history.

**Fix Required:** Add commitHistory() after element deletion

**Estimated Effort:** 2 hours

## Medium Priority (Improvements)

### 13. No Keyboard Shortcuts for Common Actions ✅ COMPLETED

**Issue:** Only undo/redo have keyboard shortcuts.

**Fix Applied:** Added shortcuts for:

- Delete (Delete/Backspace)
- Duplicate (Ctrl+D)
- Rotate (R key)
- Grid (G key)
- Save (Ctrl+S)
- Zoom (Ctrl+Plus/Minus)

**Estimated Effort:** 4 hours

### 14. No Clear All for Current Floor ✅ COMPLETED

**Issue:** Users must delete rooms one by one to clear a floor.

**Fix Applied:** Added Clear Floor button with confirmation dialog in the Floor section

**Estimated Effort:** 3 hours

### 15. No Element Duplication ✅ COMPLETED

**Issue:** Can duplicate rooms but not individual elements.

**Fix Applied:** Added duplicate button (Copy icon) for room elements in the Properties panel

**Estimated Effort:** 3 hours

### 16. No Multi-Select for Bulk Operations

**Issue:** Can only select one room at a time.

**Fix Required:** Add Shift+Click to select multiple rooms

**Estimated Effort:** 8 hours

- **Status:** Completed - Implemented basic multi-select with Shift+Click support (requires refactoring to selectedRoomIds array)

### 17. No Snap to Grid Toggle ✅ COMPLETED

**Issue:** Rooms snap automatically but users cannot control it.

**Fix Applied:** Added Snap to Grid toggle in settings. When enabled, rooms snap to 1ft grid; when disabled, allow fractional positioning. A "GRID SNAP ON" indicator is shown on canvas when enabled.

**Estimated Effort:** 4 hours

### 18. Missing Ruler Measurement Tool ✅ COMPLETED

**Issue:** No way to measure distances between rooms.

**Fix Applied:** Added Ruler button to canvas toolbar. Click two points on canvas to measure distance. Measurement result persists until a new measurement is started.

**Estimated Effort:** 6 hours

### 19. No Room Grouping/Organization ✅ COMPLETED

**Issue:** Rooms have no tags, categories, or layers.

**Fix Applied:** Added LayerManager component in sidebar. Users can create layers, toggle visibility, and assign rooms to layers via the properties panel. Also added room category, tags, and notes fields.

**Estimated Effort:** 6 hours

### 20. No Print Styles

**Issue:** Print output includes all UI elements.

**Fix Required:** Add media print styles to hide controls

**Estimated Effort:** 3 hours

### 21. Vastu Zone Explanations Missing

**Issue:** Users see zone colors but do not understand them.

**Fix Required:** Add hover tooltips and legend

**Estimated Effort:** 3 hours

### 22. No Loading State for AI Analysis ✅ COMPLETED

**Issue:** AI analysis takes time but shows no progress indicator.

**Fix Applied:** Added progress bar that animates during AI analysis. Controls are automatically disabled during analysis.

**Estimated Effort:** 3 hours

### 23. Share Link Does Not Include AI Analysis ✅ COMPLETED

**Issue:** Shared plans do not include AI analysis results.

**Fix Required:** Include analysis in compressed plan data

**Estimated Effort:** 4 hours

- **Status:** Completed - Analysis is now included in shared plans

## Low Priority (Nice to Have)

- ### 24. Better Error Messages for Large Plans ✅ COMPLETED
- **Fix Applied:** Added size validation and clear error messages for plans exceeding 1MB (share) and 2MB (export)

### 25. No Export as SVG ✅ COMPLETED

**Issue:** Only PNG export available.

- **Fix Applied:** Added SVG export button that generates clean vector output

### 26. No Dark Mode ✅ COMPLETED

**Issue:** Only light theme available.

- **Fix Applied:** Added Sun/Moon toggle in Header. Preference persisted to localStorage. All UI elements styled for both light and dark themes.

**Estimated Effort:** 6 hours

### 27. No Plan Templates ✅ COMPLETED

**Issue:** Users must start from blank plan.

- **Fix Applied:** Added predefined templates (Small Apartment, Medium House, Large Villa) accessible from Plot Settings.

**Estimated Effort:** 6 hours

### 28. No Version Comparison ✅ COMPLETED

**Issue:** Cannot compare differences between versions.

- **Fix Applied:** Added version comparison in Project Manager with room count diff display.

**Estimated Effort:** 8 hours

### 29. No Plan Import/Export (JSON) ✅ COMPLETED

**Issue:** Cannot import/export raw plan data.

- **Fix Applied:** Added JSON import/export buttons in the Data Management section of the sidebar.

**Estimated Effort:** 4 hours

### 30. No Collaborative Editing ✅ COMPLETED

**Issue:** Plan is local only, no real-time collaboration.

**Fix Applied:**

- Created Node.js/Express backend server with Socket.io (`server/`)
- Real-time room-based collaboration with join/leave
- Live cursor tracking for all connected users
- Chat messaging system with user presence
- Plan synchronization across all connected clients
- Real-time plan updates (add/update/delete rooms)
- User color coding and presence indicators
- Auto-cleanup of empty rooms

**Files Created:**

- `server/index.ts` - Socket.io server
- `server/package.json` - Server dependencies
- `server/tsconfig.json` - Server TypeScript config
- `src/hooks/useCollaboration.ts` - Client collaboration hook
- `src/components/CollaborationPanel.tsx` - Collaboration UI
- `src/types.ts` - Collaboration types

**Estimated Effort:** 20+ hours

## Summary

| Priority  | Count  | Estimated Hours | Status                    |
| --------- | ------ | --------------- | ------------------------- |
| Critical  | 5      | 16 hours        | **5/5 Complete**          |
| High      | 7      | 28 hours        | **7/7 Complete**          |
| Medium    | 10     | 48 hours        | **10/10 Complete**        |
| Low       | 8      | 52 hours        | **8/8 Complete**          |
| **Total** | **30** | **144 hours**   | **30/30 Complete (100%)** |

### Remaining Tasks (0)

- All tasks completed!

## Recommended Implementation Order

1. Week 1: Critical bugs (1-5) - 16 hours ✅ Completed
2. Week 2: High priority bugs (6-12) - 28 hours ✅ Completed
3. Week 3: Medium priority improvements (13-23) - 32 hours ✅ Completed
4. Week 4: Low priority features (24-30) - 48 hours ✅ Completed
   - Tasks 19, 24, 25, 26, 27, 28, 29, 30 ✅ Completed

---

## Launch Readiness (Production Checklist)

These tasks are required before the app can be considered a full-fledged production web application.

### Immediate (No Backend Required)

| #   | Task                                                             | Status  | File(s)                                                 |
| --- | ---------------------------------------------------------------- | ------- | ------------------------------------------------------- |
| L1  | Add React Error Boundaries to prevent full-app crashes           | ✅ Done | `src/components/ErrorBoundary.tsx`                      |
| L2  | Auto-save plan to localStorage on every change                   | ✅ Done | `src/hooks/useFloorPlan.ts`                             |
| L3  | Add keyboard shortcut help modal (`?` key)                       | ✅ Done | `src/components/ShortcutHelp.tsx`                       |
| L4  | Fix ImageEditor model name (validate against current Gemini API) | ✅ Done | `src/services/gemini.ts`                                |
| L5  | Add undo/redo for element-level changes (not just room-level)    | ✅ Done | `src/components/Room.tsx`, `src/hooks/useCanvasDrag.ts` |
| L6  | Add input min/max validation to all numeric fields               | ✅ Done | `src/App.tsx`                                           |
| L7  | Add onboarding/tutorial for first-time users                     | ✅ Done | `src/components/Onboarding.tsx`                         |
| L8  | Add PWA manifest.json and service worker                         | ✅ Done | `public/manifest.json`, `index.html`                    |
| L9  | Improve print styles (hide more UI chrome, add page breaks)      | ✅ Done | `src/index.css`                                         |
| L10 | Add loading skeleton for AI analysis panel                       | ✅ Done | `src/App.tsx`                                           |
| L11 | Add SEO meta tags to index.html                                  | ✅ Done | `index.html`                                            |
| L12 | Add room search/filter in sidebar                                | ✅ Done | `src/App.tsx`                                           |
| L13 | Fix roadmap-direction arrow rendering on canvas                  | ✅ Done | `src/components/Compass.tsx`                            |

### Requires Backend / Infrastructure

| #   | Task                                                        | Status     | Notes                              |
| --- | ----------------------------------------------------------- | ---------- | ---------------------------------- |
| L14 | Add user authentication (OAuth, email/password)             | 🔲 Pending | Need auth provider                 |
| L15 | Persist plans to database (PostgreSQL/MongoDB)              | 🔲 Pending | Need cloud DB                      |
| L16 | Replace URL-based sharing with database share links         | 🔲 Pending | Short shareable URLs               |
| L17 | Add auto-save to cloud                                      | 🔲 Pending | Depends on L14, L15                |
| L18 | Add CI/CD pipeline (GitHub Actions)                         | ✅ Done    | `.github/workflows/ci.yml`         |
| L19 | Add Docker support                                          | ✅ Done    | `Dockerfile`, `docker-compose.yml` |
| L20 | Add testing infrastructure (Vitest + React Testing Library) | ✅ Done    | 55 unit/integration tests          |
| L21 | Add E2E tests (Playwright)                                  | ✅ Done    | 7 happy-path tests                 |
| L22 | Add ESLint + Prettier configuration                         | ✅ Done    | `eslint.config.js`, `.prettierrc`  |
| L23 | Add error tracking (Sentry)                                 | ✅ Done    | `@sentry/react` (prod only)        |
| L24 | Add analytics (Plausible/PostHog)                           | ✅ Done    | `plausible-tracker`                |
| L25 | Deploy collaboration server                                 | 🔲 Pending | `server/` needs hosting            |

## Notes

- All fixes should include unit tests where applicable
- Consider adding telemetry for feature usage
- Documentation should be updated for any API changes
