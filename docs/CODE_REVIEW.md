# VastuPlan 2D — Code Review & Improvement Log

> **Status:** Living document — created 2026-06-07 from a full sweep of the repository. Updated 2026-06-21 to add the G-2/G-7/G-12 batch (`fix/g2-g7-g12-batch`, merged via PR #68) and the G-6/G-8/G-11 batch (`fix/g6-g8-g11-batch`, merged via PR #70).
> **Source tree reviewed:** `src/`, `server/`, `tests/`, configuration files, CI workflows, docs.
> **Scope:** Correctness bugs, security/data-safety issues, performance concerns, accessibility gaps, code quality, and developer-experience improvements.
>
> **Severity legend:** 🔴 Bug (likely user-visible breakage) · 🟠 Smell / risk · 🟡 Quality / DX · 🟢 Nice-to-have.

> **P0 sweep — RESOLVED 2026-06-08 in PR #28:** B-1, B-2, B-5, B-10, B-11, S-5, S-7, S-10, S-15 all fixed. See the [✅ Resolved in PR #28](#-resolved-in-pr-28) section at the bottom of this document for per-bug commit refs, and `CHANGELOG.md` for the user-facing change log.
>
> **P1 quick-wins — RESOLVED 2026-06-09 in PR #39:** B-3, B-7, S-16, B-17 all fixed. See the [✅ Resolved in P1 quick-wins](#-resolved-in-p1-quick-wins) section at the bottom of this document.
>
> **P1 batch #2 — RESOLVED 2026-06-11 in PR #43:** S-2, S-9, S-17, S-21, Q-10 all fixed. See the [✅ Resolved in P1 batch #2](#-resolved-in-p1-batch-2) section at the bottom of this document.
>
> **P2 hygiene batch — RESOLVED 2026-06-11 in PR #44:** S-22, Q-5, Q-6, Q-7+Q-14, Q-15, Q-20, Q-25 all fixed (plus the missed S-21 doc row). See the [✅ Resolved in P2 hygiene batch](#-resolved-in-p2-hygiene-batch) section at the bottom of this document.
>
> **P2 refactor batch — RESOLVED 2026-06-11 in PR #45:** S-8, S-12, Q-9, Q-12, S-3 all fixed. See the [✅ Resolved in P2 refactor batch](#-resolved-in-p2-refactor-batch) section at the bottom of this document.
>
> **Test-coverage batch (Q-2 + Q-3) — RESOLVED 2026-06-11 in PR #46:** Q-2 (`useFloorPlan` history, +15 tests), Q-3 (`useCollaboration` socket lifecycle, +20 tests) all fixed. See the [✅ Resolved in test-coverage batch](#-resolved-in-test-coverage-batch) section at the bottom of this document.
>
> **Test-coverage batch (Q-1) — RESOLVED 2026-06-12 in PR #47:** Q-1 (`useCanvasDrag` behavioural tests, +23 tests) fixed. See the [✅ Resolved in test-coverage batch (Q-1)](#-resolved-in-test-coverage-batch-q-1) section at the bottom of this document.
>
> **Post-deploy polish — RESOLVED 2026-06-12 on `fix/post-deploy-polish` (3 commits, pending PR):** Tailwind v4 `dark:` variant enabled (was previously dead code); 53 darkMode ternaries migrated to the `dark:` variant; `useTheme()` context; `formatFloor()` helper for ordinal floor labels. See the [✅ Resolved in post-deploy polish](#-resolved-in-post-deploy-polish) section at the bottom of this document.

---

## 1. Executive Summary

The codebase is in good shape: clear modular split (App → Canvas/Room/RoomElement + hooks + services), strong feature coverage (vastu scoring, AI analysis, real-time collab, dark mode, PWA), and an active test suite. The most important issues are concentrated in four areas:

1. **State-management edge cases** — multi-floor selection, undo/redo, autosave, and view-mode sharing have corner cases that lose or leak state.
2. **App.tsx size (1,839 lines)** — still a god-component. Many handlers and JSX blocks should move out.
3. **Collaboration hook correctness** — stale-closure bugs and `useEffect` re-runs that reconnect the socket on every `plan` change.
4. **Accessibility & keyboard nav gaps** — `useKeyboardShortcuts` ignores some shortcuts inside contentEditable and may steal focus from rich editors; the help modal documents shortcuts that are not actually wired (`H`, `Tab`, `Arrows`, `Space`).

The remainder are quality issues (testing, docs, build config) that can be triaged over time.

---

## 2. 🔴 Bugs (correctness)

### B-1. `useCollaboration` re-runs the connection effect on every `plan` change

**File:** `src/hooks/useCollaboration.ts:194`

```ts
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [plan, onPlanChange, userId]);
```

`plan` is in the dep array, so every keystroke in the auto-save effect re-runs the connection `useEffect`, which calls `socket.disconnect()` in its cleanup. This **toggles the WebSocket connection on every change** — high risk of dropped collaborations, infinite reconnect loops, and the server seeing constant disconnect/reconnect storms.

**Fix:** Remove `plan` and `onPlanChange` from the dep array. Use refs for the latest plan/callback and only depend on `userId` (and an initial connect flag).

---

### B-2. Collaboration `applyRemoteUpdate` uses stale `plan` from the outer closure

**File:** `src/hooks/useCollaboration.ts:27-58`

The hook captures `plan` in `useCallback`'s closure. When a remote update arrives, `applyRemoteUpdate` calls `onPlanChange({ ...plan, rooms: ... })` based on the `plan` value at the time the callback was memoized. Two rapid remote updates applied in the same React batch will use the same stale `plan`, **dropping the second update**.

**Fix:** Use the `onPlanChange` functional form (e.g., `setPlan(prev => ...)`) and pass the previous plan through, or read from a `planRef` that mirrors state.

---

### B-3. `setPlan` stale state used in "Clear floor" handler

**File:** `src/App.tsx:1000`

```ts
const newRooms = plan.rooms.filter((r) => r.floor !== currentFloor);
setPlan({ ...plan, rooms: newRooms });
```

Uses the captured `plan` (from render closure) rather than the functional form. If `commitHistory()` or another `setPlan` queued in the same tick updates `plan`, the clear-floor call will overwrite that work.

**Fix:** `setPlan(prev => ({ ...prev, rooms: prev.rooms.filter(...) }))` (and route through `updatePlan`).

---

### B-4. `rotateRoom` does not recompute element bounds after rotation

**File:** `src/App.tsx:362-368`, `src/components/Room.tsx:87-97`

Rotating a 90° swaps `w`/`h` but does **not** re-run the element-bounds clamp logic from `updateRoom` (which only triggers when `w`, `h`, or `wallThickness` change). Since both `w` and `h` change, `updateRoom` _does_ clamp elements — so the "outer" `updateRoom` path is OK. However, the double-click element rotation in `Room.tsx:87-97` only mutates `elements` and **does not** call `updateRoom`'s bounds logic, so a 90° rotation can leave an element poking through a wall if it was previously hugging the edge.

**Fix:** After updating `element.rotation`, run the same inner-wall clamp the drag hook uses (DRY the clamp into a helper in `useCanvasDrag.ts` or `lib/elements.ts`).

---

### B-5. View mode does not lock the entire UI; only the sidebars are dimmed

**File:** `src/App.tsx:654, 1281`

When `appMode === 'view'`, the left and right sidebars get `opacity-50 pointer-events-none`, but the central canvas container and toolbar are still interactive. A view-mode user can still hit `Ctrl+S`, `Ctrl+D`, `Delete`, etc. (since `useKeyboardShortcuts` doesn't check `appMode`). The help modal shows "Edit Copy" only for `view`, not for `comment` mode, where editing is also disabled.

**Fix:** Wrap `useKeyboardShortcuts` to early-return when `appMode !== 'edit'`. Show "Edit Copy" for both view and comment. Make the canvas's pointer-events honor `appMode` (currently the canvas itself is still pointer-active).

---

### B-6. `useFloorPlan.resetPlan` does not commit the seeded autosave, but `useEffect` will — and that race can flash old state on mount

**File:** `src/hooks/useFloorPlan.ts:89-107`

`resetPlan` writes to localStorage synchronously, but on first mount the `useEffect` autosave runs once with the initial state, then `loadAutoSave()` runs again, etc. More importantly, `useFloorPlan` initialises `history` with `[startPlan]`, so any `commitHistory()` right after `resetPlan` works, but if the user undoes immediately after a reset, the "before-reset" state is gone — that's by design, but the function name `resetPlan` is misleading because it does **not** reset history. Either rename to `loadPlan` or actually clear history correctly with a guard against the immediate `commitHistory` no-op in `commitHistory` (it already short-circuits identical snapshots, which is good).

**Fix:** Document the behavior in the hook's JSDoc and rename to `loadPlan` to avoid the trap.

---

### B-7. `RulerOverlay` measurement persists after the canvas is unmounted / re-mounted

**File:** `src/components/Canvas.tsx:42-56`, `src/components/RulerOverlay.tsx:11-33`

The component reset effect only clears `measureStart/End` when `measuring` toggles to `true`. The `RulerOverlay` continues to display the previous distance after the user has toggled off `measuring`, because `measureEnd` is only set when the second click happens. The README claims it "persists until a new measurement is started" — that is correct, but the **`Distance` label is formatted with `'ft` regardless of unit** even when the user has switched to meters in `plan.unit`. This produces wrong values in metric mode.

**Fix:** Compute the unit string from `plan.unit` in `RulerOverlay` and display `m` when appropriate.

---

### ✅ B-8. `Canvas` `onPointerDown` always deselects on canvas click — but shift+click on canvas never adds anything (so the shift-key path is meaningless there)

**Status:** Resolved in `fix/b-8-marquee-select` (2026-06-21).

**Files:** `src/hooks/useSelection.ts`, `src/components/Canvas.tsx`, `src/App.tsx`, `tests/e2e/basic.spec.ts`

**What changed:**

- `useSelection.ts` added `selectMany(ids, shiftKey)` for batch replace (plain drag) or merge (shift+drag).
- `Canvas.tsx` now tracks a live marquee selection box from canvas background `pointerdown` through `pointermove` to `pointerup`. The final box is intersected against `floorRooms` and the resulting ids are passed to `onSelectMany`. Plain drag clears the previous selection before computing the box; shift+drag preserves it. The marquee is skipped while measuring or when `appMode !== 'edit'`.
- `App.tsx` wires the hook's `selectMany` into the design `<Canvas>`.
- Tests: 6 new unit tests in `Canvas.test.tsx`, 2 in `useSelection.test.ts`, and 1 Playwright E2E test that adds two bedrooms, marquee-selects both, and deletes them.

---

### B-9. `PresentationExport` PDF scaling does not fit non-square plots

**File:** `src/components/PresentationExport.tsx:88-96`

```ts
const pdfWidth = 7;
const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
const xOffset = 0.4 + (7 - pdfWidth) / 2; // 0.4 + 0 = 0.4
const yOffset = 0.4 + (7.7 - pdfHeight) / 2;
```

For a tall plot (e.g. 30×60), the captured PNG is taller than wide, so `pdfHeight` ≈ 14 — but the available area is 7.7 inches tall, so the image overflows. There's also no aspect-fit logic. The PDF either clips the image or renders off-page.

**Fix:** Compute `scale = min(pdfMaxWidth / imgProps.width, pdfMaxHeight / imgProps.height)` and use the same scale for both dimensions.

---

### B-10. `share link` does not strip the `plan` query param when the user later edits the plan

**File:** `src/App.tsx:153-178`

The shared plan is loaded once on mount, but the URL still contains `?mode=view&plan=…`. If the user then `handleShare('view')` again, `generateShareLink` is called with the _current_ plan (post-edit) and a new URL is generated — good. But the page does not clear `?plan=` from the URL after loading, so refreshing while editing continues to load the **original** shared plan over the user's changes. This silently destroys work.

**Fix:** `history.replaceState(null, '', window.location.pathname)` (or `?mode=…` only) immediately after `resetPlan`.

---

### B-11. `OfflineIndicator` SVG path is malformed/garbled

**File:** `src/components/OfflineIndicator.tsx:29`

The inline `<path d="…">` contains invalid data (multiple misplaced `l-.43-1.06` segments, broken control points). Most modern browsers will still render _something_ but the result is not the intended wifi/cloud-off icon. The icon will likely not match the design intent.

**Fix:** Replace with a real lucide-react icon (`WifiOff`) — it's already in the project's icon set, used elsewhere.

---

### B-12. `useFloorPlan` autosave on the first render clobbers imported data

**File:** `src/hooks/useFloorPlan.ts:7-22, 100-107`

`loadAutoSave()` runs at module init (top of the hook), but the initial `useState(startPlan)` then triggers the autosave `useEffect`, which writes back the same data. However, if the hook is constructed with a non-trivial `initialPlan` (e.g., from a shared-link load that happens _after_ the hook initializes), the autosave effect re-runs and may write the **autosave value** over the loaded shared plan. Because the shared-link loader uses `resetPlan` which sets autosave explicitly, this is mostly fine — but there is a race window where the autosave effect fires before `resetPlan` runs.

**Fix:** Add a `loadedAt` ref and skip the first autosave when `loadedAt < firstPlanSettling`.

---

### B-13. `Room` re-renders on every plan change due to `vastu` memo dep on `plan` object identity

**File:** `src/components/Room.tsx:47`

```ts
const vastu = useMemo(() => analyzeRoomVastu(room, plan as any), [room, plan]);
```

`plan` is a new object reference on every `updatePlan` call. So every room on the floor recomputes `vastu` on every drag tick, every selection change, every undo. With 50 rooms and a slow drag, this is the biggest perf cost in the app.

**Fix:** Depend only on the parts of `plan` that matter: `plan.plotWidth`, `plan.plotHeight`, `plan.northAngle`. Or precompute `vastuByRoomId` in `App.tsx` and pass it down.

---

### B-14. `RulerOverlay` "Distance" only rounds to whole feet; half-foot precision is available from the snap grid

**File:** `src/components/RulerOverlay.tsx:13`

```ts
Math.round(Math.sqrt(...))
```

Hard round to int. With `snapToGrid` off, sub-foot precision is available but discarded. Inconsistent with the rest of the app (which uses `Math.round(x * 2) / 2` for halves).

**Fix:** `Math.round(value * 2) / 2` and respect `plan.unit` for display.

---

### B-15. `Room.tsx` `isShared` does not use the `floorRooms` filter passed in for the current floor (it receives `floorRooms`, but the prop is unused beyond that)

**File:** `src/components/Room.tsx:57-77`

`isShared` is supposed to highlight shared walls (where two rooms touch). It does check overlaps correctly with the `TOLERANCE` constant, but it does not account for `room` being on a different floor. Since `floorRooms` is already filtered to current floor (`Canvas.tsx:68-74`), this works today. However, the function is exported implicitly via `useCallback` and could be reused incorrectly later.

**Fix:** Add a JSDoc warning and a `console.assert(floorRooms.every(r => r.floor === room.floor))` in dev.

---

### B-16. PWA service worker caches `/index.html` but the SPA route is `/` (or any path). Hard reload on deep-link fails offline.

**File:** `src/services/sw.ts:2`

`ASSETS_TO_CACHE = ['/', '/index.html', ...]`. Good. But the install handler doesn't precache the JS/CSS bundles (Vite emits content-hashed assets under `/assets/`). Offline first-paint works only if the user has already loaded the page once. The current code is correct for "revisit offline" but the install-time cache should also include the manifest, and the navigation fallback for SPA routes (`'/some/path'`) returns the cached `/index.html`. This is missing.

**Fix:** Add a navigation fallback in the fetch handler:

```ts
if (event.request.mode === 'navigate') {
  event.respondWith(caches.match('/index.html') ?? fetch(event.request));
}
```

---

### B-17. `tailwindcss/typography` plugin is imported but only used in the analysis panel; if `darkMode` is on, `prose-slate` is not dark-aware and produces white background on the analysis panel in dark mode.

**File:** `src/App.tsx:1734`

`prose prose-sm prose-slate max-w-none` — `prose-slate` has dark variants (`prose-invert`), and `dark:prose-invert` is not applied. In dark mode, the rendered markdown has white background and slate-900 text, which is jarring.

**Fix:** `prose prose-sm prose-slate dark:prose-invert max-w-none`.

---

### B-18. `Add Rooms` buttons have no `aria-label`; the "12'x12'" size string changes per click target, so screen readers may not announce consistently.

**File:** `src/App.tsx:1087-1100`

Minor a11y — give each button a stable aria-label like "Add Bedroom, 12 by 12 feet".

---

### B-19. `useFloorPlan.commitHistory` is not safe to call during render

**File:** `src/App.tsx:763-764`

`onMouseUp={commitHistory}` on the north-angle slider calls `commitHistory` during event handling (fine), but if React fires the synthetic event during a render cycle (it doesn't here, but the pattern is fragile). Add a `useCallback` for `commitHistory` in the hook and memoize it.

**Fix:** Already memoized via `useCallback` in the hook. No change needed, but document the contract.

---

### B-20. `Room` shares its onPointerDown bubble through to `Canvas` onPointerDown when the resize handle is clicked

**File:** `src/components/Room.tsx:114, 144-158`

`onPointerDown={(e) => onPointerDown(e, room, 'drag')}` is on the outer div; the resize handles also call `onPointerDown` (with `type: 'resize'`). `e.stopPropagation()` is called inside `useCanvasDrag`'s `handlePointerDown`, but the React onPointerDown handler on the outer div will also fire first (React events bubble before native stopPropagation takes effect). In practice, this means clicking a resize handle also fires the "drag" branch in `handlePointerDown`, then `e.stopPropagation()` stops the bubble — but `useCanvasDrag` sets `draggingRoom` _and_ then the resize handle's call would overwrite with `resizingRoom`. Because of `setState` ordering, this is fine, but the _outer_ div onPointerDown fires too, setting `dragOffset` based on the room's center. Memory waste, no visible bug.

**Fix:** Wrap the outer div's onPointerDown to bail if `e.target !== e.currentTarget`.

---

## 3. 🟠 Code smells & risks

### S-1. `App.tsx` is 1,839 lines — still a god-component ✅ RESOLVED

After the v0.2 alpha refactor, the canvas was split out, but App.tsx still owned layout, sidebars, toolbars, properties panel, export modal triggers, keyboard shortcut wiring, theme, sharing, import/export, and the full room-crud surface.

**Resolved 2026-06-21 in PR #67.** The 1,839-line `src/App.tsx` is now a ~220-line orchestrator. All editor state and handlers moved into the new `usePlanEditor` hook (`src/hooks/usePlanEditor.ts`), and the UI shell was split into focused layout modules under `src/components/layout/`:

- `Sidebar.tsx` — plot settings, floor selector, layer manager, JSON import/export, add-rooms grid
- `Toolbar.tsx` — grid toggle, undo/redo, zoom, share, presentation export, PNG/print/JSON/SVG/ruler
- `CanvasArea.tsx` — canvas wrapper + print-only area
- `PropertiesPanel.tsx` — `RoomPropertiesPanel` + AI analysis panel
- `MobileTabs.tsx` — mobile tab switcher

`usePlanEditor` now owns plan/history, `currentFloor`, selection, UI state, room CRUD, import/export/share/analyze, and derived metrics. 13 tests in `src/hooks/usePlanEditor.test.ts` + 8 smoke tests in `src/components/layout/layout.test.tsx`. See `memory/s1-split-app-shipped.md`.

### S-2. `useEffect` dep arrays ignored in three places

- `useCollaboration.ts:194` — see B-1
- `useCollaboration.ts:194` (also: `userId` in deps means the connection recreates once the user joins, mid-session)
- `App.tsx:178` (shared plan loader) — empty deps but the comment acknowledges the trade-off; should be at minimum a one-shot guard.

### S-3. `setPlan` is exposed from `useFloorPlan` and called directly with non-functional form, bypassing the history-aware `updatePlan`

This is a footgun: any direct `setPlan(...)` that doesn't go through `updatePlan` will create a "phantom" state that is not added to history. Undo/redo then has gaps. Replace the public surface with `updatePlan` only, or make `setPlan` strictly type-checked to prevent this.

### S-4. Vastu ideal-direction data is hard-coded in `vastu.ts` with no test coverage beyond `analyzeRoomVastu`

There's no test that asserts "Kitchen in SE → score 100, status good". A change to `IDEAL_ZONES` can silently regress product behavior. Add property tests for each room type × direction pair.

### S-5. `analytics.ts` reads `process.env.REACT_APP_*` but the project is Vite (which exposes `import.meta.env.VITE_*`)

`process.env.REACT_APP_*` is not populated by Vite. Tracking will never report. Should be `import.meta.env.VITE_ANALYTICS_*` (and the `.env.example` should be updated).

### S-6. `sentry.ts` reads `process.env.SENTRY_DSN` / `process.env.NODE_ENV`

In Vite, `process.env` is only populated via the `define` block in `vite.config.ts`. Currently only `GEMINI_API_KEY` is defined. Sentry will read `undefined` for DSN and `process.env.NODE_ENV` is set by Vite to `production`/`development` for builds. But the `dsn` is a `string | undefined`, and the `enabled` flag uses `process.env.NODE_ENV === 'production'`. In dev, Sentry stays disabled (correct). In prod, `Sentry.init` is called with `dsn: undefined` if no env, which logs a Sentry warning. Acceptable, but should be documented.

### S-7. `setUser` and `setProperties` are not really used

`sentry.ts:79-93` defines `setUser` / `setTag` / `addBreadcrumb` but the Sentry instance is initialized with `Sentry.init(...)` only in `main.tsx`'s `initSentry` call. In dev, `initSentry` no-ops, so `setUser` (called from `App.tsx:147`) will call `Sentry.setUser` on an un-initialized Sentry. Sentry's v10 SDK tolerates this (it queues), but a runtime warning is logged. Either gate these calls behind the same `enabled` flag, or always call `Sentry.init` with a no-op config in dev.

### S-8. Hard-coded color/size magic numbers in `useCanvasDrag.ts`

- `TOLERANCE = 0.1` (also re-declared in `Room.tsx`)
- `snapValue = 0.1` for sub-foot snap
- `innerW = room.w - 2 * wallFt` repeated in 3+ files
- Wall thickness defaults to `9` in many places

Promote to `constants/geometry.ts`.

### S-9. `useCanvasDrag`'s `handleElementPointerDown` uses `room.wallThickness` for the wall offset but does not handle the "shared wall" case (where only half the wall belongs to this room)

Means elements in adjacent rooms are placed against a _virtual_ wall that's `wallFt/2` from the actual edge if a neighbor shares that wall, but the inner wall is treated as the room's `wallFt` for placement. In practice, because the room rect already accounts for shared walls in its `innerW`/`innerH` (`Room.tsx:79-85`), the drag code should use that. Currently it uses `2 * wallFt` (full) — which is wrong for shared-wall rooms. The element bounds will be off by `wallFt/2` on each shared side.

This is a subtle but real bug. Fix by passing the room's already-computed `innerW/innerH` into the drag hook.

### S-10. `toast` notifications are routed through `(window as any).showToast?.(...)` instead of the actual context

`App.tsx:219`:

```ts
(window as any).showToast?.(`Added ${type} room`, 'success');
```

The `ToastProvider` exposes `useToast()` (see `Toast.tsx:20`). But `addRoom` does not have access to that hook (it's outside a component). This is a workaround for a not-yet-refactored top-level function. The `showToast` global is never assigned anywhere — the call is a silent no-op. So **toast notifications on room add are dead code**.

**Fix:** Move `addRoom` inside a component (it's already called from a component) and use `useToast()`. Or register the toast API globally from `ToastProvider` via `window.showToast = showToast` and add a "registered" check.

### S-11. `Canvas.tsx` `useEffect` for measurement reset uses `setState` in effect with a disable comment

```ts
useEffect(() => {
  if (measuring) {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMeasureStart(null);
    setMeasureEnd(null);
  }
}, [measuring]);
```

The disable comment suggests it was a workaround. The effect only clears state when `measuring` is true — but on first mount with `measuring=true`, it clears a state that was already `null`. Dead reset. Replace with a `useState(() => ...)` initializer pattern or move the reset into the toolbar button's onClick.

### S-12. `error: any` caught in `App.tsx` (handleShare, handleImportJSON, etc.)

A handful of `catch (error: any)` blocks should be `catch (error: unknown)` and narrow with `error instanceof Error` for the `message` access. This is a TS strict-mode issue caught only by `tseslint`.

### S-13. `tasklabels` in `Header.tsx` props — the `appMode` and `activeTab` are set from `App` and never animated on mode change

Minor UX issue — the "view mode" / "comment mode" pill slides in but the underlying tools don't get hidden. See B-5.

### S-14. SVG export in `lib/exports.ts` does not escape user-input strings (room types like `<script>Bedroom</script>` would inject)

Not exploitable today (room types are hard-coded literals) but if a future feature allows custom room names, this becomes XSS in exported SVGs viewed in a browser.

```ts
`<text ...>${r.type}</text>`;
```

Use `escapeXml(r.type)`.

### S-15. `PresentationExport.tsx` reads the logo with `FileReader` but doesn't validate the file is actually an image

`accept="image/png, image/jpeg"` on the input is a UI hint only. A user can pass a `.svg` or `.exe` and the reader will happily encode it as data URL, then `pdf.addImage(logoUrl, 'PNG', ...)` will throw at runtime. Add a MIME-type check after `onload`.

### S-16. `ProjectManager` writes to `localStorage` without try/catch around `setItem`

`ProjectManager.tsx:33`:

```ts
localStorage.setItem('vastu_projects', JSON.stringify(newProjects));
```

If the projects list is large (e.g., 50+ versions × 200 rooms each), this can throw `QuotaExceededError`. Wrap in try/catch and surface a toast.

### S-17. `Onboarding` modal has no `aria-modal="true"` and no focus trap

Tab key will leave the modal. The keyboard handler will then fire on whatever it lands on (e.g., the Add Rooms button). Add `role="dialog"`, `aria-modal="true"`, and trap focus inside the modal.

### S-18. `ToastProvider` toast counter resets if the provider remounts

`Toast.tsx:91` uses `toastIdRef.current`. If `ToastProvider` ever unmounts and remounts (e.g., React 19 strict mode in dev), the counter resets. Low risk.

### S-19. `eslint-disable react-hooks/set-state-in-effect` is used in 4 places (`App.tsx`, `Canvas.tsx`, `CollaborationPanel.tsx`, `ProjectManager.tsx`)

The pattern is becoming a smell. Either enable the rule project-wide with a single justification comment, or refactor to compute initial state lazily. Currently 4 separate disables are noise.

### S-20. `useFloorPlan`'s history compaction is silent — when `commitHistory` shifts the array, the user's "current pointer" jumps without UI feedback

If a user undoes past the head of history (rare with bounded history), the experience is jarring. Document the behavior.

### S-21. `Sentry.ErrorBoundary` + custom `ErrorBoundary` are nested

`main.tsx:28-32` wraps the app in `Sentry.ErrorBoundary` _and_ the custom `ErrorBoundary`. The custom one already calls `captureError` from `services/sentry`, so the outer Sentry one is redundant. Pick one.

### S-22. `sw.ts` has a typo in the version string of `CACHE_NAME` (`vastuplan-v1`) and no bump strategy

If you change any cached asset, the cache name must bump, or users will be stuck on the old shell. Add a CI step or build-time inject of the cache name.

### S-23. `Canvas` `onPointerDown` is on the canvas div which also receives a `setMeasureStart`; if a child room's pointer-down also bubbles here, the `measureStart` could be set by accident

`Room` calls `e.stopPropagation()` in `useCanvasDrag.handlePointerDown`, but the React onPointerDown on the room div also fires first. So `setMeasureStart` may also fire for room clicks. Wrap the canvas onPointerDown in a check for `e.target === e.currentTarget`.

### S-24. `eslint.config.js` ignores `server/`, but the server has its own tsconfig — verify the server's `lint` script exists or add it

`server/package.json` has no `lint` script. The CI workflow only lints the client.

### S-25. CI runs `npm audit` and Snyk, but no test for the `server/` package

A regression in the collab server (e.g., a thrown exception in `index.ts`) won't be caught.

---

## 4. 🟡 Quality / DX

### Q-1. No tests for the `useCanvasDrag` hook, the most complex non-trivial logic in the client

This hook handles 100% of drag, resize, and rotation math. A refactor without tests is dangerous. Add Vitest + RTL tests covering:

- snap-to-grid on/off
- sub-foot precision
- collision detection (other rooms in path)
- shared-wall clamp
- element bounds clamp
- element rotation swap

### Q-2. No tests for `useFloorPlan` history management

> **Resolved 2026-06-11 on `fix/q-2-q-3-hook-tests`** (test-coverage batch, awaiting PR). 15 behavioural tests added in `src/hooks/useFloorPlan.test.ts` covering: the `commitHistory` identical-state guard, the `MAX_HISTORY_SIZE` cap, undo/redo at the head and the tail, the "new commit after undo truncates the redo branch" invariant, `resetPlan`, and the functional-form `updatePlan`.

Boundary cases:

- `commitHistory` with identical state (no-op) — covered indirectly, but no assertion
- `commitHistory` past `MAX_HISTORY_SIZE`
- `undo` at the head and tail

### Q-3. No tests for `useCollaboration` socket lifecycle

> **Resolved 2026-06-11 on `fix/q-2-q-3-hook-tests`** (test-coverage batch, awaiting PR). 20 new tests added in `src/hooks/useCollaboration.test.ts` covering: the B-1 stable-deps effect, the B-2 functional `onPlanChange` setter, the S-12 `getErrorMessage` error-narrowing path (Error / string / number fallbacks), the room-joined plan-sync fallback, the local-echo guard on `plan-updated`, the `plan-synced` echo guard, `joinRoom` / `leaveRoom` / `broadcastUpdate` public-API behaviour, and the unmount cleanup.

The most fragile part of the system and the least tested. Mock socket.io-client.

### Q-4. E2E suite only covers 7 happy-path tests; no negative or multi-step flows

See `memory/e2e-tests-completed.md` for the existing test list and remaining areas.

### Q-5. No `vitest` config for coverage thresholds; CI does not fail on regression

Add a `coverage.thresholds.lines/functions/branches/statements: 70` to `vitest.config.ts`.

### Q-6. `tsconfig.json` has `allowJs: true` but no `.js` files in `src/`

Tighten: drop `allowJs` (or set `checkJs: false` to silence the noisy lib check).

### Q-7. The `tsconfig.json` excludes `src/services/sw.ts` from type-checking, so service worker types drift

Add a separate `tsconfig.sw.json` and include it in CI to type-check the SW independently.

### Q-8. `package.json` has `motion` (Framer Motion) but no usage in source

`grep -r "from 'motion'" src/` → no matches. Either remove the dep or use it for canvas pan/zoom transitions.

### Q-9. `socket.io-client` is at the client but the server uses raw `socket.io`; no versioned API contract

Define a `types/collab.ts` on both sides so the client and server share a `PlanUpdateEvent` type. Today the types are duplicated (`src/types.ts:81-88` and `server/src/index.ts:54-60`).

### Q-10. `appMode` is a string union duplicated in three files

`App.tsx:118`, `Header.tsx:7-8`, `useKeyboardShortcuts.ts:13` (implicitly). Extract to a `type AppMode` and export from `types.ts`.

### Q-11. `error: any` in many places — should be `unknown` per TypeScript best practice

Affected files: `App.tsx` (5+ occurrences), `lib/exports.ts` (no), `server/src/index.ts` (no). Add `eslint @typescript-eslint/no-explicit-any: 'warn'` (currently off in `eslint.config.js`).

### Q-12. `src/lib/exports.ts` is `158` lines and mixes 5 concerns

Split:

- `lib/exportPng.ts`
- `lib/exportJson.ts`
- `lib/exportSvg.ts`
- `lib/shareLink.ts`
- `lib/printPlan.ts`

### Q-13. The `App.tsx` print-area block has three separate `<Canvas>` renderings (live, print-area, modal)

The two print-area `<Canvas>` instances are dead code (`hidden print:block`), and they have no `onUpdateRoom` handlers, so they re-mount the canvas with stale `onUpdateRoomEnd`. Remove them or replace with a single `CanvasPrint` component.

### Q-14. `tsconfig.json` lists `src/test/setup.ts` in `exclude` but the `include` lists `vitest.config.ts` which references it

Verify the exclude is correct; currently the file is included because `include: ["src"]` overrides the exclude on a per-file basis.

### Q-15. `package.json` devDeps include `autoprefixer` but no PostCSS config (Tailwind v4 uses `@tailwindcss/vite`)

`autoprefixer` is dead dep. Remove.

### Q-16. `server/src/index.ts` doesn't use the `query` import from `db/connection.js` (line 7)

Dead import. Remove or wire up.

### Q-17. `Dockerfile` and `docker-compose.yml` exist but CI doesn't build them

Add a `docker-build.yml` workflow.

### Q-18. No changelog for v0.2.x ✅ Resolved 2026-06-21

`CHANGELOG.md` was collapsed onto the actual `0.1.x` alpha line in the 0.1.1 release sweep (`8b6ae08`). `VERSION`, `package.json`, `CHANGELOG.md`, and `README.md` now all agree at `0.1.1`. This batch (`fix/s4-b9-q18-batch`) updated `CHANGELOG.md` under `[Unreleased]` for S-4 and kept the release note accurate; `VERSION` remains `0.1.1` until the next release.

### Q-19. `tasks.md` says "30/30 completed" but doesn't reference the current `feature/v0.2-alpha` branch or v0.1.0 version ✅ Resolved 2026-06-21

Tie tasks to versions. Added a "Version context" note at the top of `tasks.md` tying the original 30 tasks to the **0.1.0 alpha** scope and pointing to `docs/KNOWN_ISSUES.md` / `docs/CODE_REVIEW.md` for the active backlog.

### Q-20. `package.json` doesn't declare Node engine version ✅ Resolved 2026-06-21

`package.json` and `server/package.json` now declare `"engines": { "node": ">=22.0.0" }`, `.nvmrc` is `22`, and the README runtime requirement is updated to Node.js >= 22. This matches the CI Node version.

### Q-21. `.env.example` lists `GEMINI_API_KEY` and `APP_URL` but the README and vite.config.ts only reference `GEMINI_API_KEY` (or `VITE_GEMINI_API_KEY`) ✅ Resolved 2026-06-21

Removed the unused `APP_URL` variable and the redundant `GEMINI_API_KEY` alias from `.env.example`. Only env vars actually read by the client or server remain.

### Q-22. No README section on accessibility (ARIA, focus trap, reduced motion) ✅ Resolved 2026-06-21

Added a dedicated README "Accessibility" section: skip link, ARIA labels, focus trap + `Esc` + focus restore, keyboard-shortcut table, read-only mode locking, and `prefers-reduced-motion`. Also documents known gaps.

### Q-23. No README section on internationalization (currently English-only) ✅ Resolved 2026-06-21

Added a README "Internationalization" section: states the app is English-only, recommends a future `messages.ts` / `react-i18next` catalog, and notes locale formatting, unit conversion, and RTL concerns.

### Q-24. `metadata.json` is at the repo root — used by the host (AI Studio)? ✅ Resolved 2026-06-21

Documented in README: `metadata.json` is a host-discovery file consumed by the hosting environment (e.g., Google AI Studio / project listings). It contains `name`, `description`, and `requestFramePermissions`.

### Q-25. `vite.config.ts` has a `define` for `GEMINI_API_KEY` but `gemini.ts` reads `process.env.GEMINI_API_KEY` ✅ Resolved 2026-06-21

Standardized on `VITE_GEMINI_API_KEY` as the only supported source. Removed the `process.env.GEMINI_API_KEY` build-time `define` from `vite.config.ts`, removed the `process.env.*` fallbacks in `src/services/gemini.ts`, and dropped the `GEMINI_API_KEY` alias from `.env.example`. `src/vite-env.d.ts` already typed `VITE_GEMINI_API_KEY`.

---

## 5. 🟢 Nice-to-have

- **G-1.** Undo/redo across the collaboration boundary (multi-user undo). — ✅ resolved in G-1/G-13/G-14 batch
- **G-3.** A "staircase" element with proper cut-out rendering for multi-floor plans. — ✅ resolved in G-3/G-4/G-5 batch
- **G-4.** A "plumbing" overlay for kitchens and bathrooms (showing water connections). — ✅ resolved in G-3/G-4/G-5 batch
- **G-5.** Sun-path / shadow calculation for each room based on orientation and date. — ✅ resolved in G-3/G-4/G-5 batch
- **G-6.** A "compliance" report PDF that combines Vastu score, AI analysis, and the floor plan in one document. — ✅ resolved in G-6/G-8/G-11 batch
- **G-8.** Per-room cost estimation (not just total). — ✅ resolved in G-6/G-8/G-11 batch
- **G-9.** Snap-to-grid configurable to imperial or metric base. — ✅ resolved in G-9/G-10/G-15 batch
- **G-10.** A "tour" of all Vastu zones with hover cards on the grid (currently only the cell label appears). — ✅ resolved in G-9/G-10/G-15 batch
- **G-11.** A "share with annotation" mode that allows collaborators to drop comments on the canvas. — ✅ resolved in G-6/G-8/G-11 batch
- **G-13.** Add `@testing-library/user-event` keyboard tests for `useKeyboardShortcuts`. — ✅ resolved in G-1/G-13/G-14 batch
- **G-14.** Generate a "share" link with optional password protection (encrypts the plan blob). — ✅ resolved in G-1/G-13/G-14 batch
- **G-15.** Auto-name floors (Ground, First, Second) based on Indian conventions. — ✅ resolved in G-9/G-10/G-15 batch

---

## 6. Triage recommendations

> **State as of 2026-07-11:** The historical bug/refactor backlog (§1–§5) is fully resolved. M-1 through M-5 and M-8 are now resolved (M-4/M-5 merged via PR #98). Supabase Auth Phase 1 merged via PR #89. The active roadmap is now the **v0.2 / v0.3 market-driven feature backlog** sourced from [`docs/vastuplan-market-dig.md`](./vastuplan-market-dig.md). CODE_REVIEW.md keeps the historical §1–§5 entries for traceability; the living "what's next" list is below.

### 6.1 v0.2 — SHIP next 60–90 days (gates the 90-day hypothesis test)

| ID  | Title                                             | Effort   | Status       | Owner                                                            |
| --- | ------------------------------------------------- | -------- | ------------ | ---------------------------------------------------------------- |
| M-1 | Vector PDF export + watermark gate                | M        | ✅ resolved  | PR #90.                                                          |
| C1  | Gemini API key exposed to browser bundle          | Critical | ✅ resolved  | PR #91. AI proxy on Railway.                                     |
| M-2 | Razorpay / Instamojo payment integration          | S        | ✅ resolved  | PR #97. One-time ₹499 Pro Export Pack.                           |
| M-3 | QR-code share export                              | XS       | ✅ resolved  | PR #95.                                                          |
| M-4 | Wire up `?mode=comment` annotation UI             | S        | ✅ resolved  | PR #98. Comment toolbar + author persistence.                    |
| M-5 | PWA basics: manifest + service worker + IndexedDB | S        | ✅ resolved  | PR #98. IndexedDB plan store + autosave/offline restore.         |
| M-6 | SEO content: 16 zone pages + pillar + landing     | L        | ✅ resolved  | PR #99. 16 `/zones/:slug` pages, `/zones` pillar, landing links. |
| M-7 | Mobile UX polish (touch targets, property panel)  | S        | 🟡 In review | Branch `feat/m-7-mobile-ux-polish` pushed; manual PR pending.    |
| M-8 | Vastu matrix source citation + methodology page   | S        | ✅ resolved  | PR #95.                                                          |

### 6.2 v0.3 — SHIP 90–180 days

| ID   | Title                                      | Effort | Status            | Owner |
| ---- | ------------------------------------------ | ------ | ----------------- | ----- |
| M-9  | Hindi i18n                                 | L      | 🔲 pending        | —     |
| M-10 | Auth + cross-device sync                   | L      | 🟡 partially done | —     |
| M-11 | Consultant tier landing + referral program | S      | 🔲 pending        | —     |
| M-12 | Custom Vastu matrix override               | M      | 🔲 pending        | —     |
| M-13 | Sketch/PDF upload → auto-room detection    | L      | 🔲 pending        | —     |
| M-14 | Side-by-side property compare              | M      | 🔲 pending        | —     |

### 6.3 Enhance / Optimize

| ID  | Title                                     | Effort | Status     |
| --- | ----------------------------------------- | ------ | ---------- |
| E-1 | Brahmasthan / CENTER scoring clarity      | S      | 🔲 pending |
| E-2 | Multi-user undo in collab                 | M      | 🔲 pending |
| E-3 | Per-room rotation + multi-room transforms | S      | 🔲 pending |
| O-1 | Bundle size / FCP / canvas virtualization | S      | 🔲 pending |
| O-2 | Test coverage ≥80% on critical paths      | M      | 🔲 pending |
| O-3 | Accessibility (WCAG 2.1 AA)               | S      | 🔲 pending |
| O-4 | Sentry + Plausible event tracking         | S      | 🔲 pending |

### 6.4 Rejected / deferred

See [`docs/vastuplan-market-dig.md`](./vastuplan-market-dig.md) §5.5 for the full reject list (3D/VR, native Android/iOS in v0.2, per-month SaaS > ₹1,500, consultant marketplace, in-app ads, AI auto-Vastu generator in v0.2, AR/LiDAR, generic interior catalogs, fundraising before 90-day test, competing on AI report price).

### 6.5 Historical buckets (all resolved)

| Bucket                   | Items                      | Status |
| ------------------------ | -------------------------- | ------ |
| **P0 — Fix now**         | all 9 resolved in PR #28   | ✅     |
| **P1 — Fix this sprint** | all resolved (B-8 shipped) | ✅     |
| **P2 — Refactor**        | S-1 and S-4 shipped        | ✅     |
| **P3 — Polish**          | all G / Q items resolved   | ✅     |

**Where to start next:** The §1–§5 bug backlog is empty. M-1 through M-8 are in review or resolved. **M-7** is awaiting manual PR/merge; after it lands the v0.2 SHIP backlog is complete. See [`tasks.md`](../../tasks.md) for the day-to-day tracker.

---

## ✅ Resolved in G-3/G-4/G-5 construction-overlays batch

> The 2026-06-26 construction-visualization batch (`fix/g3-g4-g5-construction-overlays`) shipped the last 3 nice-to-haves from `docs/CODE_REVIEW.md` §5, plus a mobile canvas-overflow fix and a Sentry `process.env` → `import.meta.env.DEV` cleanup. User-facing features with unit tests and updated docs. Branch target: `main` via PR.

| ID  | Title                        | Per-bug entry | Tests | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | ---------------------------- | ------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-3 | Staircase element            | §5 G-3        | +3    | `ROOM_ELEMENTS['Stairs']` in `src/constants/floorPlanConstants.ts` gains a `{ type: 'Staircase', w: 4, h: 10 }` element. `src/components/RoomElement.tsx` renders staircases with a step-hatch pattern. `STAIRCASE_ADDED` analytics event fired from `usePlanEditor.addRoomElement`. New `RoomElement.test.tsx`.                                                                                                                                                                                                                            |
| G-4 | Plumbing overlay             | §5 G-4        | +2    | New `src/components/PlumbingOverlay.tsx` SVG layer draws water connections for kitchens and bathrooms. Wired through `usePlanEditor` (`showPlumbing`, `handleTogglePlumbing`), `CanvasArea`, `Canvas`, `App.tsx`, and a new "Overlays" section in `Sidebar`. `PLUMBING_OVERLAY_TOGGLED` analytics event. New `PlumbingOverlay.test.tsx`.                                                                                                                                                                                                    |
| G-5 | Sun path / shadow overlay    | §5 G-5        | +6    | New `src/components/SunPathOverlay.tsx` renders convex-hull shadow polygons per room from orientation, date, time, and room height. `FloorPlan.latitude?: number` (defaults to `DEFAULT_LATITUDE` = New Delhi). `Sidebar` exposes date / time / latitude controls plus a "Now" button. New `src/utils.ts` helpers: `getSunPosition`, `formatSunTime`, `parseSunTime`, `DEFAULT_ROOM_HEIGHT_FT`, `DEFAULT_LATITUDE`. `SUN_PATH_TOGGLED` and `SUN_PATH_TIME_CHANGED` analytics events. New `SunPathOverlay.test.tsx` + `utils.test.ts` cases. |
| —   | Mobile canvas overflow       | —             | +1    | `src/App.tsx` center wrapper `items-center` → `items-start md:items-center` so the plan's left edge stays visible on mobile. `src/components/VastuTour.tsx` splits the canvas-relative highlight from a viewport-centered `fixed` info card. Extended `VastuTour.test.tsx`.                                                                                                                                                                                                                                                                 |
| —   | Sentry `process.env` cleanup | —             | +2    | `src/services/sentry.ts` uses `import.meta.env.DEV` instead of `process.env.NODE_ENV`. New `sentry.test.ts` cases delete `globalThis.process` and assert `captureError` / `captureMessage` do not throw.                                                                                                                                                                                                                                                                                                                                    |
| —   | Overlay API surface          | —             | +2    | `usePlanEditor` exposes `showPlumbing`, `handleTogglePlumbing`, `showSunPath`, `sunDate`, `sunTime`, `handleToggleSunPath`, `handleSetSunDate`, `handleSetSunTime`, `handleSetSunNow`. New `usePlanEditor.test.ts` cases pin the public keys and overlay toggles.                                                                                                                                                                                                                                                                           |

**Validation:** `npx tsc --noEmit` ✅, `npm run test -- --run` (382/382, +16 new) ✅, `npm run lint` ✅ (0 errors; 72 pre-existing warnings unchanged), `npm run build` ✅, `npm audit --audit-level=moderate` ✅ 0 vulnerabilities.

---

## ✅ Resolved in Q-20/Q-21/Q-25 env/docs batch

> The 2026-06-21 env/docs tidy batch (`fix/q-20-q21-q25-batch`) closed the last three P3/Q items from `docs/CODE_REVIEW.md` §4. Low-risk config and doc changes only.

| ID   | Title                              | Per-bug entry | Tests | Notes                                                                                                                                                                                                                                                                |
| ---- | ---------------------------------- | ------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-20 | `package.json` Node engine version | §4 Q-20       | —     | `package.json` and `server/package.json` now declare `"engines": { "node": ">=22.0.0" }`; `.nvmrc` updated to `22`; README runtime requirement updated to Node.js >= 22. Matches CI.                                                                                 |
| Q-21 | `.env.example` cleanup             | §4 Q-21       | —     | Removed unused `APP_URL` and redundant `GEMINI_API_KEY` alias from `.env.example`. Only env vars actually consumed by the client/server remain.                                                                                                                      |
| Q-25 | Gemini env standardization         | §4 Q-25       | —     | `VITE_GEMINI_API_KEY` is now the only supported source. Removed `process.env.GEMINI_API_KEY` build-time `define` from `vite.config.ts`, removed `process.env.*` fallbacks from `src/services/gemini.ts`, and dropped the `GEMINI_API_KEY` alias from `.env.example`. |

**Validation:** `npm run lint` ✅ (0 errors; 72 pre-existing warnings unchanged), `npm test` ✅, `npm run build` ✅.

---

## ✅ Resolved in G-9/G-10/G-15 batch

> The 2026-06-21 Vastu-UX / floor-label batch (`fix/g9-g10-g15-batch`) shipped 3 nice-to-haves from `docs/CODE_REVIEW.md` §5. User-facing features with unit + smoke tests and updated docs. Branch target: `main` via PR.

| ID   | Title                         | Per-bug entry | Tests | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---- | ----------------------------- | ------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-9  | Configurable snap grid        | §5 G-9        | +2    | `FloorPlan.gridSize` (default 1 ft) persists with the plan. `Sidebar.tsx` shows a "Grid Step" selector when snap is on, with options 0.5/1/2/3/5 ft rendered in meters when `plan.unit === 'm'`. `Canvas.tsx` and `CanvasArea.tsx` pass `gridSize` to the background grid and to `useCanvasDrag`, which snaps drag/resize to the chosen step. New `DEFAULT_GRID_SIZE_FT` and `GRID_SIZE_OPTIONS_FT` in `src/constants/geometry.ts` plus tests. |
| G-10 | Vastu zone tour + hover cards | §5 G-10       | +4    | New toolbar compass button toggles a guided 9-step tour overlay (`VastuTour.tsx`) that highlights each zone and displays element, ideal use, and tip. `VastuGrid.tsx` cells render `title` tooltips from `src/constants/vastuZones.ts`. Tour auto-enables the Vastu grid. New `VASTU_TOUR_TOGGLED` analytics event.                                                                                                                            |
| G-15 | Auto-named floors             | §5 G-15       | +2    | New `formatFloorLabel(n, floorNames?)` in `src/constants/floorPlanConstants.ts` defaults to Indian conventions (`Ground Floor`, `First Floor`, `Second Floor`, …) and supports custom names via `plan.floorNames`. Replaced ordinal `formatFloor()` in UI, prints/PDF exports, and E2E selectors. New `getDefaultFloorName()` helper and tests.                                                                                                |

**Validation:** `npm run lint` ✅ (0 errors; 72 pre-existing warnings unchanged), `npm test -- --run` (366/366, +9 new) ✅, `npm run build` ✅.

---

## ✅ Resolved in G-2/G-7/G-12 batch

> The 2026-06-21 nice-to-have batch (`fix/g2-g7-g12-batch`) shipped 3 small high-impact features from `docs/CODE_REVIEW.md` §5. Merged via **PR #68** (merge commit `0999aa2`). All three are user-facing, tested, and documented. The original §5 entries are kept above for traceability (marked resolved in-place by removal from the active list).

| ID   | Title                                                                  | Per-bug entry  | Tests | Notes                                                                                                                                                                                                                                                                                                                      |
| ---- | ---------------------------------------------------------------------- | -------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-7  | Keyboard shortcut to nudge a room by 1 ft in any direction             | §5 G-7         | +7    | `useKeyboardShortcuts.ts` `onNudge` option + arrow-key handler; `usePlanEditor.ts` `nudgeSelectedRooms(direction)` with buildable-area clamping and history commit. New `analytics.ts` `ROOM_NUDGED` event. `ShortcutHelp.tsx` updated.                                                                                    |
| G-2  | "Duplicate floor" button to clone an entire floor's rooms onto another | §5 G-2         | +4    | `usePlanEditor.ts` `duplicateFloor(sourceFloor, targetFloor)` clones rooms with new IDs, switches to target floor, selects clones, and toasts via `showToastEvent`. `Sidebar.tsx` adds "Duplicate {formatFloor(currentFloor)}" button next to "Clear Floor"; disabled when current floor has no rooms. Wired in `App.tsx`. |
| G-12 | Replace `(window as any).showToast` with a real event-based toast API  | §5 G-12 / S-10 | +3    | `Toast.tsx` now dispatches and listens for `vastuplan:show-toast` CustomEvents; exports `showToastEvent(message, type?)` and a `_showToast` fallback. Used by `duplicateFloor` and `nudgeSelectedRooms`. 3 new tests in `Toast.test.tsx`.                                                                                  |

**Validation:** `npm run lint` ✅ (0 errors; pre-existing warnings unchanged), `npm test` (299/299, +14 new) ✅, `npm run test:e2e` (9/9) ✅, `npm run build` ✅.

---

## ✅ Resolved in G-6/G-8/G-11 batch

> The 2026-06-21 feature batch (`fix/g6-g8-g11-batch`) shipped 3 high-impact nice-to-haves from `docs/CODE_REVIEW.md` §5: G-6 (compliance report PDF), G-8 (per-room cost estimation), and G-11 (share-with-annotation mode). Merged via **PR #70** (merge commit `ea3e41d`). All three are user-facing, tested, and documented. The original §5 entries are kept above for traceability and marked resolved in-place.

| ID   | Title                      | Per-bug entry | Tests | Notes                                                                                                                                                                                                                                                                                                                                  |
| ---- | -------------------------- | ------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-6  | Compliance report PDF      | §5 G-6        | +6    | `ComplianceReportExport.tsx` modal triggered from `Toolbar`. Captures live canvas via `toPng`, builds a portrait letter PDF with metadata, Vastu score, AI summary, per-room table, total area, and floor-plan image. Pure builder in `src/lib/complianceReport.ts`.                                                                   |
| G-8  | Per-room cost estimation   | §5 G-8        | +6    | `Room.costPerSqFt?: number` defaulting to `2000`. `RoomPropertiesPanel` shows area + cost for single selection and combined cost for multi-selection. `Sidebar` total uses `getTotalCost()` + `formatCurrency()`. Helpers in `src/utils.ts`.                                                                                           |
| G-11 | Share-with-annotation mode | §5 G-11       | +4    | `AppMode` widened to include `'comment'`. Comment-enabled share links load in `comment` mode. `Canvas` renders/drops/selects comment pins; `CommentPropertiesPanel` edits/deletes them (read-only in `view` mode). Comment CRUD lives in `usePlanEditor`; `analytics.ts` tracks `COMMENT_ADDED`, `COMMENT_UPDATED`, `COMMENT_DELETED`. |

**Validation:** `npm run lint` ✅ (0 errors; pre-existing warnings unchanged), `npm test` (315/315, +16 new) ✅, `npm run test:e2e` (9/9) ✅, `npm run build` ✅.

---

## ✅ Resolved in PR #28

> The 2026-06-07 review filed 9 P0 bugs (data loss / silent failure / wrong behavior). All 9 were fixed and merged in PR #28 on 2026-06-08. The per-bug entry numbers in §2 / §3 above are preserved for traceability — they are kept in this document as historical record, not as live issues.

| ID   | Title                                                         | Fix commit                                 | Per-bug entry |
| ---- | ------------------------------------------------------------- | ------------------------------------------ | ------------- |
| B-1  | `useCollaboration` reconnects socket on every `plan` change   | `5c579e8`                                  | §2 B-1        |
| B-2  | `applyRemoteUpdate` uses stale `plan` closure                 | `5c579e8`                                  | §2 B-2        |
| B-5  | View mode does not lock the entire UI                         | `6dda15e`, `e0c3df2`, `6608c72`, `85a234e` | §2 B-5        |
| B-10 | Shared-link URL never cleared — refresh reverts edits         | `85a234e`                                  | §2 B-10       |
| B-11 | `OfflineIndicator` SVG path is malformed                      | `1c0686e`                                  | §2 B-11       |
| S-5  | Analytics reads `process.env.REACT_APP_*` (Vite-incompatible) | `dbd6f4a`, `51190e4`                       | §3 S-5        |
| S-7  | Sentry helpers called on un-initialized SDK in dev            | `9f4b7a4`                                  | §3 S-7        |
| S-10 | `(window as any).showToast?.(...)` is a silent no-op          | `85a234e`                                  | §3 S-10       |
| S-15 | `PresentationExport` logo upload doesn't validate MIME        | `7d0b359`                                  | §3 S-15       |

Also in the same PR: **Q-1** — `AppMode` string union extracted to `src/types.ts` (`7f3a0ad`).

**Validation:** `npm run lint` ✅, `npm test` (25/25) ✅, `npm run test:e2e` (8/8) ✅, `npm run build` ✅.

**How to apply:** When filing a new P0, add it to §2 (or §3 for smells) and to the §6 triage table. When fixing one, add a row to the table above with the fix commit, **do not** delete the original §2/§3 entry — keep the history.

---

## ✅ Resolved in P1 quick-wins

> The 2026-06-09 P1 quick-wins batch fixed 4 P1 items in branch `fix/p1-quick-wins` and shipped in PR #39 (merge commit `1694af7`). The per-bug entries in §2 / §3 are kept for traceability. Test coverage added in 2 of the 4 cases.

| ID   | Title                                                         | Per-bug entry | Tests | Notes                                                                                             |
| ---- | ------------------------------------------------------------- | ------------- | ----- | ------------------------------------------------------------------------------------------------- |
| B-3  | "Clear floor" uses captured `plan` (stale-closure risk)       | §2 B-3        | —     | `App.tsx` clear-floor handler now uses `updatePlan((prev) => ...)`. `setPlan` import removed.     |
| B-7  | Ruler distance label hard-codes `' ft` in metric mode         | §2 B-7        | +4    | `RulerOverlay` accepts `unit: 'ft' \| 'm'`. ft→m at 0.3048. Half-foot rounding (B-14) also fixed. |
| S-16 | `ProjectManager` writes to `localStorage` without try/catch   | §3 S-16       | +3    | `saveProjects` wraps setItem. Toasts on `QuotaExceededError` (and any other DOMException).        |
| B-17 | `prose-slate` is not dark-aware → white-on-white in dark mode | §2 B-17       | —     | `dark:prose-invert` on the analysis panel container in `App.tsx`.                                 |

**Validation:** `npm run lint` ✅ (1 pre-existing Toast warning unchanged), `npm test` (33/33, +8 new) ✅, `npm run build` ✅. E2E was not re-run locally; the changed code paths are not covered by the existing e2e suite.

---

## ✅ Resolved in P1 batch #2

> The 2026-06-11 P1 batch #2 fixed 5 P1 items (S-2, S-9, S-17, S-21) and 1 P2 item (Q-10) in branch `fix/p1-batch-2` and shipped in PR #43 (merge commit `36b67ca`). The per-bug entries in §2 / §3 are kept for traceability.

| ID   | Title                                                                            | Per-bug entry | Tests | Notes                                                                                                                                                                                                                     |
| ---- | -------------------------------------------------------------------------------- | ------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S-2  | Three `useEffect` dep arrays ignored (collaboration, App share loader)           | §3 S-2        | +1    | Resolved-by-design. The two remaining disables (App.tsx:182, Room.tsx:56) are load-bearing; a structural test in `useCollaboration.test.ts` pins the disable count to ≤ 2.                                                |
| S-9  | `useCanvasDrag` element placement uses full wall thickness for shared-wall rooms | §3 S-9        | +4    | New `getEffectiveWalls(room, otherRooms)` helper in `useCanvasDrag.ts`; element-drag uses per-side effective walls (shared = `wallFt/2`).                                                                                 |
| S-17 | `Onboarding` modal lacks `aria-modal` and focus trap                             | §3 S-17       | +3    | Full WAI-ARIA dialog: `role` / `aria-modal` / `aria-labelledby` (via `useId`), Esc-to-close, Tab/Shift+Tab focus trap, focus restore on close. Onboarding test extended to 4 cases.                                       |
| S-21 | Pick one of Sentry.ErrorBoundary vs custom ErrorBoundary (nested)                | §3 S-21       | —     | Dropped `Sentry.ErrorBoundary` in `main.tsx`; the custom `ErrorBoundary` already calls `captureError` in `componentDidCatch`, so the Sentry wrapper was double-reporting. Doc row was missed in PR #43; closed in PR #44. |
| Q-10 | Extract `AppMode` type to a single source of truth                               | §4 Q-10       | —     | `Header.tsx` now imports `AppMode` from `src/types.ts` (was the last offender; `src/types.ts:146` was already the source of truth from the P0 sweep).                                                                     |

**Validation:** `npm run lint` ✅ (0 errors), `npm test` (51/51, +8 new) ✅, `npm run build` ✅.

---

## ✅ Resolved in P2 hygiene batch

> The 2026-06-11 P2/P3 hygiene batch fixed 7 P2/P3 items in branch `fix/p2-hygiene-batch` and shipped in PR #44 (merge commit `bf2c214`). The per-bug entries in §2 / §3 are kept for traceability. No test coverage changes beyond the +4 S-22 hash tests; the rest are config, type, and tooling.

| ID   | Title                                                                              | Per-bug entry | Tests | Notes                                                                                                                                                                                                         |
| ---- | ---------------------------------------------------------------------------------- | ------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S-21 | Sentry.ErrorBoundary + custom ErrorBoundary are nested                             | §3 S-21       | —     | Code change shipped in the P1 batch #2 (`a8ab03f`); this PR closes the doc row that was missed.                                                                                                               |
| S-22 | `sw.ts` CACHE_NAME hard-coded to `vastuplan-v1`; no bump strategy                  | §3 S-22       | +4    | Per-deploy SHA-256 of `index.html` injected via Vite `define` → `__VASTUPLAN_CACHE_NAME__`. Also fixes a latent bug: the SW was never bundled in production — only served from dev — so users never got a SW. |
| Q-5  | No vitest config for coverage thresholds; CI doesn't fail on regression            | §4 Q-5        | —     | v8 provider, text+html reporter, thresholds set just below the current measured coverage.                                                                                                                     |
| Q-6  | `tsconfig.json` has `allowJs: true` but no `.js` files in `src/`                   | §4 Q-6        | —     | Dropped the unused option.                                                                                                                                                                                    |
| Q-7  | `tsconfig.json` excludes `src/services/sw.ts` from type-checking                   | §4 Q-7        | —     | Re-included. SW typed properly now (addEventListener overloads pick up ExtendableEvent/FetchEvent).                                                                                                           |
| Q-14 | `tsconfig.json` lists `src/test/setup.ts` in `exclude` but `vitest.config` uses it | §4 Q-14       | —     | Re-included; added `types: ["vitest/globals"]` so `vi`, `afterEach`, `expect.extend` are typed.                                                                                                               |
| Q-15 | `package.json` has `motion` + `autoprefixer` but no usage in source                | §4 Q-15       | —     | Also dropped `@sentry/tracing`. 12 packages removed from `node_modules`.                                                                                                                                      |
| Q-20 | `package.json` doesn't declare Node engine version                                 | §4 Q-20       | —     | `engines.node: ">=20.0.0"` + `.nvmrc` (20).                                                                                                                                                                   |
| Q-25 | `gemini.ts` reads `process.env.GEMINI_API_KEY` instead of Vite's `import.meta.env` | §4 Q-25       | —     | Flipped precedence to `import.meta.env.VITE_GEMINI_API_KEY`; type-augmented in `vite-env.d.ts`.                                                                                                               |

**Validation:** `npm run lint` ✅ (0 errors, 2 pre-existing warnings), `npm test` (55/55, +4 new) ✅, `npm run build` ✅, `npm run test:coverage` ✅ (passes new thresholds). The new coverage gate (Q-5) will fail CI if coverage regresses below the current floor.

---

## ✅ Resolved in test-coverage batch (Q-1)

> The 2026-06-11 test-coverage batch (Q-1) fixed the last untested complex hook in branch `fix/q-1-use-canvas-drag-tests` (pending PR). The per-bug entry in §4 is kept for traceability. Tests-only — no source-code or behaviour changes.

| ID  | Title                                                            | Per-bug entry | Tests | Notes                                                                                                                                                                                                                                                                                                                                                                                             |
| --- | ---------------------------------------------------------------- | ------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-1 | No tests for `useCanvasDrag` (the most complex non-trivial hook) | §4 Q-1        | +23   | Three new describe blocks: room drag (snap-to-grid 1ft / 0.1ft, plot-bounds clamp, same-floor collision clamp x/y, other-floor rooms ignored, pointerup lifecycle), room resize (SE/SW handles, 2ft min, plot clamp, pointerup), element drag (`draggingElement` state, half-foot rounding, inner-room clamp, Door opening overhang, pointerup). The 4 pre-existing B-5 + S-9 tests are retained. |

**Validation:** `npm run lint` ✅ (0 errors, 2 pre-existing warnings unchanged), `npm test` (78/78, +23 new) ✅, `npm run build` ✅.

**Subtle implementation note:** the `handlePointerMove` listener early-returns on `if (!canvasRef.current) return`, so every test that dispatches `pointermove` on `window` must use a non-null `canvasRef.current` with a real `getBoundingClientRect()` (otherwise the listener bails before calling `onUpdateRoom`). The test file's `canvasRef()` helper makes this ergonomic.

---

## ✅ Resolved in P2 refactor batch

> The 2026-06-11 P2 refactor batch fixed 5 P2 items in branch `fix/p2-refactor-batch` (commits `c40e621`..`f45745b`) and shipped in PR #45. The per-bug entries in §2 / §3 are kept for traceability. Test count grew from 55 to 97 (+42), mostly from pinning the new constants/helpers to regression tests.

| ID   | Title                                                                                              | Per-bug entry | Tests | Notes                                                                                                                                                                                                                                                                                                                           |
| ---- | -------------------------------------------------------------------------------------------------- | ------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S-8  | Hard-coded color/size magic numbers in `useCanvasDrag.ts`                                          | §3 S-8        | +17   | New `src/constants/geometry.ts` centralizes TOLERANCE_FT (0.1), INCHES_PER_FOOT (12), DEFAULT_WALL_THICKNESS_IN (9), SNAP_GRID_FT (1), SNAP_GRID_SUB_FT (0.1), MIN/MAX_ROOM_SIZE_FT, PIXELS_PER_FOOT, FT_PER_METER, etc. Replaced 14 hard-coded values across 4 callers.                                                        |
| S-12 | `error: any` caught in `App.tsx` (handleShare, handleImportJSON, etc.)                             | §3 S-12       | +12   | New `getErrorMessage(error: unknown)` in `src/utils.ts` (12 tests). Switched 3 catch sites in App.tsx + 2 `err.message` sites in useCollaboration.ts. Lint rule `@typescript-eslint/no-explicit-any` flipped `off` → `warn` (with a follow-up comment to promote to `error` once the 30+ pre-existing any uses are cleaned up). |
| Q-9  | `socket.io-client` is at the client but the server uses raw `socket.io`; no versioned API contract | §4 Q-9        | —     | New `src/types/shared.ts` is the single source of truth for `PlanUpdateEvent`. `data: any` → `data: unknown` (forced 3 narrow-back sites in useCollaboration.ts). Server's `tsconfig.json` widened to allow the import.                                                                                                         |
| Q-12 | `src/lib/exports.ts` is `158` lines and mixes 5 concerns                                           | §4 Q-12       | +9    | Split into `exportPng.ts`, `exportSvg.ts`, `exportJson.ts`, `shareLink.ts`, `printPlan.ts`. The original `exports.ts` is now a 22-line back-compat barrel. Plus a `compressPlan` / `decompressPlan` pure-function pair in `shareLink.ts` (9 round-trip tests).                                                                  |
| S-3  | `setPlan` is exposed from `useFloorPlan` and called directly with non-functional form              | §3 S-3        | +4    | `setPlan` removed from the public return of `useFloorPlan`. Internal `setPlan` retained (used by `undo` / `redo` / `resetPlan` / `commitHistory` — those know the exact target value). `useFloorPlan.test.ts` pins the public-API shape so a future re-exposure fails CI.                                                       |

**Validation:** `npm run lint` ✅ (0 errors, 36 warnings — 35 pre-existing any uses, 1 react-refresh; 0 new), `npm test` (97/97, +42 new) ✅, `npm run build` ✅, `server tsc --noEmit` ✅. No behaviour changes; the entire diff is mechanical refactor + test pinning.

---

## ✅ Resolved in test-coverage batch

> The 2026-06-11 test-coverage batch fixed 2 P2 items in branch `fix/q-2-q-3-hook-tests` (merged in PR #46). The per-bug entries in §4 are kept for traceability. Test count grew from 97 to 128 (+31) — both hooks are now covered by behavioural tests that pin every public-API contract and the key B-1 / B-2 / S-2 / S-12 invariants.

| ID  | Title                                            | Per-bug entry | Tests | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ------------------------------------------------ | ------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-2 | No tests for `useFloorPlan` history management   | §4 Q-2        | +15   | Behavioural tests in `useFloorPlan.test.ts` covering: `commitHistory` with identical state (no-op), `commitHistory` past `MAX_HISTORY_SIZE` (50), `undo` at the head and the tail, `redo` past the head, the "new commit after undo truncates the redo branch" invariant, `resetPlan` clearing the history stack, and the functional-form `updatePlan((prev) => ...)` reading the latest state. The 4 pre-existing S-3 structural tests are retained.                                                                                                                 |
| Q-3 | No tests for `useCollaboration` socket lifecycle | §4 Q-3        | +20   | Behavioural tests in `useCollaboration.test.ts` covering: the connect / disconnect state transitions, the B-1 stable-deps effect, the B-2 functional `onPlanChange` setter, the S-12 `getErrorMessage` error-narrowing path (Error / string / number fallbacks), the `room-joined` plan-sync fallback when the server returns an empty plan, the local-echo guard on `plan-updated` (the `isLocalUpdateRef`), the `plan-synced` echo guard (`modifiedBy === our userId`), `joinRoom` / `leaveRoom` / `broadcastUpdate` public-API behaviour, and the unmount cleanup. |

**Validation:** `npm test` (128/128, +31 new) ✅, `npm run lint` ✅ (0 new warnings), `npm run build` ✅. The 3 pre-existing B-1 / B-2 / S-2 tests in `useCollaboration.test.ts` are retained unchanged. No source-code changes; the entire diff is test additions.

---

## ✅ Resolved in post-deploy polish

> The 2026-06-12 post-deploy polish batch on `fix/post-deploy-polish` (3 commits, pending PR) fixed a long-standing theme-system bug. The per-bug entry was in §3 (theme-system duplicated state, was the `Q-?` row added post-2026-06-11). The root cause was 3 things piled up:

1. **Tailwind v4's `dark:` variant was not enabled.** The 7 places that used `dark:` classes compiled to nothing because `src/index.css` had no `@custom-variant` declaration. They looked right in the code; they didn't paint.
2. **Dark mode "worked" only via 53 ternary class strings threaded as props from `App.tsx`.** This conflated "what color is this" with "is the user in dark mode", forced every new component to receive `darkMode` as a prop, and couldn't be reused outside `App`'s tree.
3. **Light and dark palettes were flat.** Header, sidebar, canvas frame, and properties panel all used the same `bg-white` / `bg-slate-50` in light mode and `bg-slate-800` / `bg-slate-900` in dark mode. The "mostly all white" UI was the visible symptom.

The fix: 1 CSS line (`@custom-variant dark (&:where(.dark, .dark *));`), 1 hook (`useDarkMode` reading from `localStorage` OR `documentElement.classList`, writing to both on change), 1 context (`<ThemeProvider>` + `useTheme()`), and migration of the 53 ternaries. The 7 already-`dark:`-using sites needed no code change — they started working the moment `@custom-variant` landed.

Test count: 151 → 159 (+8 total: +4 from `formatFloor()` in Commit 1, +4 from `useDarkMode()` in Commit 2).

| ID  | Title                                                          | Per-bug entry | Tests | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | -------------------------------------------------------------- | ------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-1 | Floor labels hardcoded as Ground/First/Second                  | §6 Q-1        | +4    | New `formatFloor()` helper in `src/constants/floorPlanConstants.ts` handles English ordinals including the 11/12/13 special case. Replaces 5 ternary sites in `App.tsx` (one in the floor selector, one in the clear-floor confirmation, two in the print headers, plus the import). The stale `// 0 = Ground, 1 = First, etc.` comment in `src/types.ts:55` is updated.                                                                                                                                                                                                                                                                                                                                                                            |
| Q-2 | Dark mode "implemented twice" (ternaries + dead dark: classes) | §6 Q-2        | +4    | The 7 already-`dark:`-using sites start working with `@custom-variant dark` in `src/index.css`. The 53 ternary class strings across `App.tsx`, `Header.tsx`, `LayerManager.tsx` migrate to the `dark:` variant with section-specific shades (page=`slate-50/900`, header=`slate-100/800`, sidebar=`white/900`, properties=`slate-50/900`, canvas=`white/800`, modal=`white/800`, input=`white/800`). `App.tsx`'s local `darkMode` state and the prop-passing to `Header` / `LayerManager` are gone; components consume `useTheme()`. New `useDarkMode()` hook handles `localStorage` + `<html class="dark">` with a per-file real-store shim in its test (the global `vi.fn()` mock in `src/test/setup.ts` would have made persistence untestable). |

**Validation:** `npm test` (159/159, +8 new) ✅, `npm run lint` ✅ (0 new errors), `npm run build` ✅ (41 `dark:` variant rules now in `dist/assets/index-*.css`; 0 before). No new dependencies. The 3-commit split keeps `git log` clean and makes the theme refactor easy to revert without losing the floor rename.

---

## ✅ Resolved in Q-19/Q-22/Q-23/Q-24 docs batch

> The 2026-06-21 documentation batch (`fix/q-19-q22-q23-q24-batch`) closed four low-risk quality items from `docs/CODE_REVIEW.md` §4. Docs-only changes; no source code or tests were touched.

| ID   | Title                               | Per-bug entry | Tests | Notes                                                                                                                                                                                                                                                  |
| ---- | ----------------------------------- | ------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Q-19 | Tie `tasks.md` to versions          | §4 Q-19       | —     | Added a "Version context" block at the top of `tasks.md` stating the original 30 tasks were the **0.1.0 alpha** scope and that the active backlog is now in `docs/KNOWN_ISSUES.md` / `docs/CODE_REVIEW.md`. Updated the completed-tasks note to 0.1.1. |
| Q-22 | README accessibility section        | §4 Q-22       | —     | Expanded README "Accessibility" section with skip link, ARIA labels, focus trap + `Esc` + focus restore, keyboard shortcuts, view/comment read-only locking, and `prefers-reduced-motion`. Also documents known gaps.                                  |
| Q-23 | README internationalization section | §4 Q-23       | —     | Added README "Internationalization" section: English-only today, future path via `messages.ts` or `react-i18next`, plus locale formatting, unit conversion, and RTL considerations.                                                                    |
| Q-24 | Document `metadata.json`            | §4 Q-24       | —     | Added README "`metadata.json`" section explaining the repo-root host-discovery file and its fields (`name`, `description`, `requestFramePermissions`).                                                                                                 |

**Validation:** `npm run lint` ✅, `npm run build` ✅. No test changes (docs-only).

---

## 7. How to update this document

- Add new findings as they appear. Use the same severity tags.
- When a bug is fixed, add a row to the `## ✅ Resolved in PR #…` section at the bottom with the date, fix commit, and the PR number. Do **not** delete the original §2 / §3 entry — keep the history.
- Keep the table in §6 in sync with the actual state of the work.
- When adding a new P0, file it in the active table **and** update `docs/KNOWN_ISSUES.md`.
