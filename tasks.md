# VastuPlan 2D — Task Tracker

## Version context

> This file is the **living roadmap**. The original 30 alpha tasks (0.1.0) are archived at the bottom of this file for traceability. The current active backlog is driven by the 2026-07-10 market deep-dive in [`docs/vastuplan-market-dig.md`](./docs/vastuplan-market-dig.md) and tracked day-to-day in [`docs/KNOWN_ISSUES.md`](./docs/KNOWN_ISSUES.md) / [`docs/CODE_REVIEW.md`](./docs/CODE_REVIEW.md).
>
> Current release line: **0.1.1 (alpha)**. Supabase Auth Phase 1 merged to `main` on 2026-07-10 (PR #89). Phase 2 cloud project sync is deferred behind the v0.2 monetization wedge.

---

## Roadmap overview

| Phase      | Goal                                           | Timeframe                            | Decision gate                                   |
| ---------- | ---------------------------------------------- | ------------------------------------ | ----------------------------------------------- |
| **v0.1.1** | Stable alpha with auth foundation              | shipped 2026-06-15 + auth 2026-07-10 | —                                               |
| **v0.2**   | Monetization wedge + viral loop                | next 60–90 days                      | 90-day hypothesis test (see market-dig.md §7.4) |
| **v0.3**   | Scale / i18n / consultant tier                 | 90–180 days after v0.2               | English wedge metrics                           |
| **v0.4+**  | Auto-room detection, compare mode, 3D deferred | 12–18 months                         | Revenue runway                                  |

---

## Active backlog — v0.2 (SHIP in 60–90 days)

These gate the 90-day hypothesis test. Source: [`docs/vastuplan-market-dig.md`](./docs/vastuplan-market-dig.md) §5.1.

| ID  | Feature                                               | Owner | Effort | Status      | Notes / files                                                                                      |
| --- | ----------------------------------------------------- | ----- | ------ | ----------- | -------------------------------------------------------------------------------------------------- |
| M-1 | **Vector PDF export + watermark gate**                | —     | M      | ✅ resolved | Core ₹499 deliverable; replaces free screenshots. Reuse `jsPDF` + `html-to-image`.                 |
| M-2 | **Razorpay / Instamojo payment integration**          | —     | S      | ✅ resolved | Blocks monetization hypothesis. One-time ₹499 Pro Export Pack.                                     |
| M-3 | **QR-code share export**                              | —     | XS     | ✅ resolved | WhatsApp/contractor on-ramp. Pure front-end QR generation.                                         |
| M-4 | **Wire up `?mode=comment` annotation UI**             | —     | S      | ✅ resolved | Unique viral loop. The back-end link already supports `comment` mode; polish the drop-pin UX.      |
| M-5 | **PWA basics: manifest + service worker + IndexedDB** | —     | S      | ✅ resolved | Offline use at construction sites. Service worker exists; extend to plan persistence in IndexedDB. |
| M-6 | **SEO content: 16 zone pages + pillar + landing**     | —     | L      | 🔲 pending  | Primary acquisition channel; must ship before AI tools own the SERP.                               |
| M-7 | **Mobile UX polish (touch targets, property panel)**  | —     | S      | 🔲 pending  | Persona A is mobile-web-first.                                                                     |
| M-8 | **Vastu matrix source citation + methodology page**   | —     | S      | ✅ resolved | Trust-builder vs. AI black-box competitors.                                                        |

---

## Active backlog — v0.3 (SHIP in 90–180 days)

Source: [`docs/vastuplan-market-dig.md`](./docs/vastuplan-market-dig.md) §5.2.

| ID   | Feature                                        | Owner | Effort | Status            | Notes                                                                 |
| ---- | ---------------------------------------------- | ----- | ------ | ----------------- | --------------------------------------------------------------------- |
| M-9  | **Hindi i18n**                                 | —     | L      | 🔲 pending        | Tier-2/3 expansion; only after v0.2 metrics prove English wedge.      |
| M-10 | **Auth + cross-device sync**                   | —     | L      | 🟡 partially done | Supabase Auth Phase 1 merged (PR #89). Phase 2: cloud plan sync.      |
| M-11 | **Consultant tier landing + referral program** | —     | S      | 🔲 pending        | Operationalize ₹999/yr channel.                                       |
| M-12 | **Custom Vastu matrix override**               | —     | M      | 🔲 pending        | Consultant-school differentiation vs. VastuAnalyzer.                  |
| M-13 | **Sketch/PDF upload → auto-room detection**    | —     | L      | 🔲 pending        | Matches user demand signal #3; closes gap with VastuIQ/VastuAnalyzer. |
| M-14 | **Side-by-side property compare**              | —     | M      | 🔲 pending        | Targets flat buyers (71% apartment preference).                       |

---

## Enhance / Optimize / Reject

Source: [`docs/vastuplan-market-dig.md`](./docs/vastuplan-market-dig.md) §5.3–5.5.

### ENHANCE

| ID  | Feature                                   | Effort | Status     | Notes                              |
| --- | ----------------------------------------- | ------ | ---------- | ---------------------------------- |
| E-1 | Brahmasthan / CENTER scoring clarity      | S      | 🔲 pending | Most common user confusion.        |
| E-2 | Multi-user undo in collab                 | M      | 🔲 pending | Differentiator vs. Foyr/MagicPlan. |
| E-3 | Per-room rotation + multi-room transforms | S      | 🔲 pending | Basic CAD primitives users expect. |

### OPTIMIZE

| ID  | Work                                      | Effort | Status     |
| --- | ----------------------------------------- | ------ | ---------- |
| O-1 | Bundle size / FCP / canvas virtualization | S      | 🔲 pending |
| O-2 | Test coverage ≥80% on critical paths      | M      | 🔲 pending |
| O-3 | Accessibility (WCAG 2.1 AA)               | S      | 🔲 pending |
| O-4 | Sentry + Plausible event tracking         | S      | 🔲 pending |

### DO NOT DO (explicitly rejected)

- 3D rendering / walkthroughs / VR
- Native Android/iOS in v0.2 (PWA-first)
- Per-month SaaS > ₹1,500
- Vastu consultant marketplace
- In-app ads for consultants
- AI "auto-Vastu" floor-plan generator in v0.2
- AR / LiDAR scanning
- Generic interior-design catalogs
- Fundraising before 90-day test
- Competing on AI report price (₹99–₹499)

---

## How to use this file

1. Pick the next unassigned task from the v0.2 table.
2. Create a branch: `git checkout -b feat/m-1-vector-pdf-watermark`.
3. Update the `Status` column to `🟡 In progress` and add your name/date.
4. When merged, move the row to the `## ✅ Resolved` section at the bottom with the PR link and summary.

---

## ✅ Recently resolved

| ID             | Title                                                                                                                                 | PR / commit        | Notes                                                                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M-1            | Vector PDF export + watermark gate                                                                                                    | PR #90 (`5e3a1c0`) | Entitlements service, vector PDF library (data/render split), `PresentationExport` raster→vector swap, watermark gate. Core ₹499 Pro Export deliverable.                             |
| M-2            | Razorpay / Instamojo payment integration                                                                                              | PR #97 (`f43decd`) | Supabase JWT auth middleware, Razorpay payments module, checkout/verify/webhook endpoints, client entitlement sync, upgrade CTA in `PresentationExport`.                             |
| M-3            | QR-code share export                                                                                                                  | PR #95 (`1d06b50`) | `QrShareModal` renders current share URL as an SVG QR code with Copy Link + Download QR SVG actions; wired into `Toolbar` and `usePlanEditor`; tracked under `SHARE_QR_OPENED`.      |
| M-8            | Vastu matrix source citation + methodology page                                                                                       | PR #95 (`1d06b50`) | New `/methodology` route renders live `IDEAL_ZONES` matrix and `getVastuZoneInfo` with source citations and direction-by-room table. Footer link added on `Landing`.                 |
| M-4            | Wire up `?mode=comment` annotation UI                                                                                                 | PR #98             | `CommentModeToolbar` with mode badge, instructions, reviewer-name input, add-pin button, and per-floor comment list. `useCommentAuthor` persists name in localStorage.               |
| M-5            | PWA basics: manifest + service worker + IndexedDB                                                                                     | PR #98             | `src/services/sw.ts` extended with IndexedDB `vastuplan-plans` store and message handlers. `planPersistence.ts` client API. Debounced autosave + offline restore in `usePlanEditor`. |
| M-10 (Phase 1) | Supabase Auth — email/password sign-up, sign-in, password reset, sign-out, `AuthContext`, auth modal, Sentry/Plausible identity hooks | PR #89 (`ba149ef`) | Optional auth: UI falls back to anonymous-only when env vars are missing. Cloud sync deferred to Phase 2.                                                                            |

---

## 📜 Historical archive — original 0.1.0 alpha tasks (30/30 complete)

> The 30 tasks below were the original **0.1.0 alpha** scope. They were all completed before the project moved to **0.1.1** (see [`VERSION`](./VERSION), [`CHANGELOG.md`](./CHANGELOG.md), and [`README.md`](./README.md)). This section is preserved as a historical snapshot.

### Completed Tasks (30/30)

- ✅ **Task 1**: Room Element Rotation Bounds Constraint — Fixed in `src/components/Canvas.tsx`
- ✅ **Task 2**: Wall Thickness Change Element Positions — Fixed in `src/App.tsx`
- ✅ **Task 3**: Missing GEMINI_API_KEY Validation — Fixed in `src/services/gemini.ts`
- ✅ **Task 4**: Vastu Grid Overlay Rotation — Fixed in `src/components/Canvas.tsx`
- ✅ **Task 5**: Undo/Redo History Bounds — Fixed in `src/App.tsx`
- ✅ **Task 6**: Share Link Not Working in View/Comment Mode — Fixed in `src/App.tsx`
- ✅ **Task 7**: PDF Export Missing Floor Number in Title Block — Fixed in `src/components/PresentationExport.tsx`
- ✅ **Task 8**: No Minimum Maximum Zoom Limits — Fixed in `src/App.tsx`
- ✅ **Task 9**: Input Validation Missing for Plot Dimensions — Fixed in `src/App.tsx`
- ✅ **Task 10**: Keyboard Navigation Not Available — Fixed in `src/App.tsx` and `src/index.css`
- ✅ **Task 11**: Undo Button Not Working for Room Deletion — Fixed in `src/App.tsx`
- ✅ **Task 12**: Element Deletion Does Not Save to History — Already working correctly
- ✅ **Task 13**: No Keyboard Shortcuts for Common Actions — Fixed in `src/App.tsx`
- ✅ **Task 14**: No Clear All for Current Floor — Fixed in `src/App.tsx`
- ✅ **Task 15**: No Element Duplication — Fixed in `src/App.tsx`
- ✅ **Task 17**: No Snap to Grid Toggle — Fixed in `src/App.tsx` and `src/components/Canvas.tsx`
- ✅ **Task 20**: No Print Styles — Fixed in `src/index.css` and `src/App.tsx`
- ✅ **Task 21**: Vastu Zone Explanations Missing — Fixed in `src/components/Canvas.tsx`
- ✅ **Task 22**: No Loading State for AI Analysis — Fixed in `src/App.tsx`

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

### Summary (historical)

| Priority  | Count  | Estimated Hours | Status                    |
| --------- | ------ | --------------- | ------------------------- |
| Critical  | 5      | 16 h            | 5/5 Complete              |
| High      | 7      | 28 h            | 7/7 Complete              |
| Medium    | 10     | 48 h            | 10/10 Complete            |
| Low       | 8      | 52 h            | 8/8 Complete              |
| **Total** | **30** | **144 h**       | **30/30 Complete (100%)** |
