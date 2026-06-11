# Next Set of Tasks - VastuPlan 2D

## Overview

This document lists the next priority tasks for VastuPlan 2D, focused on production readiness, testing, and infrastructure improvements.

---

> **Note (2026-06-11):** This document is a historical snapshot of the "next set" plan filed after the original 30-task list. Many of the items here (E2E, Sentry, Plausible, CI/CD, testing infrastructure) have been completed in the meantime. **For the active backlog, see [`docs/KNOWN_ISSUES.md`](./docs/KNOWN_ISSUES.md) and [`docs/CODE_REVIEW.md`](./docs/CODE_REVIEW.md) §6.** The original entries below are kept as a reference of what was considered "next" at the time.

---

## High Priority - Production Readiness

### 1. Add Unit and Integration Tests - ✅ COMPLETED

**Priority:** High  
**Completed:** ~6 hours

**Description:**

Set up a proper testing infrastructure with Vitest and React Testing Library to ensure code quality and prevent regressions.

**Completed:**

- Configured Vitest as the test runner with `vitest.config.ts`
- Installed React Testing Library and related dependencies
- Set up test file conventions (`*.test.ts`, `*.test.tsx`)
- Created test setup with `jsdom` configuration
- Added tests for `src/services/vastu.ts` (analyzeRoomVastu, calculateOverallVastuScore, getDirection)

**Remaining Test Goals (still active, see CODE_REVIEW Q-1 / Q-2 / Q-3):**

- Hook tests: `useFloorPlan` - history management, undo/redo, persistence
- Hook tests: `useCanvasDrag` - drag/resize logic, collision detection
- Component tests: Canvas, Room, VastuGrid, CollaborationPanel
- Utility tests: `src/lib/exports.ts`

---

### 2. Add E2E Tests with Playwright ✅ COMPLETED (happy-path baseline)

**Priority:** High  
**Status:** 7 happy-path tests passing. E2E is not yet run in CI (see CODE_REVIEW Q-4).

**Description:**

Create end-to-end tests covering critical user workflows.

**Tasks (still active):**

- Add `npx playwright install` to CI and run E2E in `.github/workflows/ci.yml`
- Extend coverage to negative paths and multi-step flows
- Cover drag, resize, rotate, undo/redo, share link roundtrip, multi-floor

**Test locations:** `tests/e2e/`

---

### 3. Add Error Tracking with Sentry ✅ COMPLETED

**Priority:** High  
**Status:** `@sentry/react` initialized in production only via `src/services/sentry.ts`. `isSentryInitialized()` guards (S-7) prevent dev-time warnings.

**Tasks (still active):**

- Rotate the Sentry DSN secret in the deploy environment
- Add a release-tracking step in CI

---

### 4. Add Analytics with Plausible or PostHog ✅ COMPLETED

**Priority:** Medium  
**Status:** `plausible-tracker` integrated. Reads `VITE_ANALYTICS_*` env vars (S-5). `.env.example` documented.

---

### 5. Deploy Collaboration Server

**Priority:** Medium  
**Status:** 🔲 Not deployed. The `server/` package has no `lint` script (CODE_REVIEW S-24) and is not built/tested in CI (S-25).

**Tasks (still active):**

- Add `lint` + `test` scripts to `server/package.json`
- Add a CI job for `server/`
- Choose a hosting provider (Railway / Cloud Run / Render)
- Configure production database (Neon PostgreSQL)

---

## Medium Priority - Infrastructure Improvements

### 6. Improve PWA Support and Service Worker ✅ COMPLETED

**Priority:** Medium  
**Status:** Per-deploy `CACHE_NAME` SHA-256 (S-22), bundled to `dist/sw.js`, registered in production. Latent prod-only SW-registration bug fixed in PR #44.

---

### 7. Add CI/CD Pipeline Improvements

**Priority:** Medium  
**Status:** Partial. Snyk step was removed (no `SNYK_TOKEN` secret; see `ci-snyk-removed` memory). E2E still not in CI. Coverage threshold gate added (Q-5) but at low floor.

**Tasks (still active):**

- Add E2E to CI (see task 2)
- Add coverage reporting to PRs (Codecov / coveralls)
- Add Dependabot for automated dependency PRs
- Add PR / issue templates
- Tighten the coverage threshold as the test suite grows

---

## Low Priority - Nice to Have

### 8. Add Keyboard Shortcut Help Enhancement

**Priority:** Low  
**Status:** Basic help modal exists (`src/components/ShortcutHelp.tsx`). Search / categorization not implemented.

---

### 9. Add Room Tag Filtering

**Priority:** Low  
**Status:** Layers (task 19) ship; tag filtering in the sidebar list is not implemented.

---

### 10. Add Plan Comparison Tool

**Priority:** Low  
**Status:** Basic `PlanComparison` component exists for version diff. Visual side-by-side not implemented.

---

## Summary

| Priority  | Tasks  | Estimated Hours | Status            |
| --------- | ------ | --------------- | ----------------- |
| High      | 5      | 30 hours        | 🟡 3/5 complete   |
| Medium    | 3      | 15 hours        | 🟡 1/3 complete   |
| Low       | 3      | 15 hours        | 🔲 Not started    |
| **Total** | **11** | **60 hours**    | **~40% Complete** |

---

## Recommended Implementation Order

1. **Week 1-2:** Unit & E2E Tests (Tasks 1, 2) - 20 hours
   - Establish testing foundation
   - Cover critical user flows

2. **Week 3:** Error Tracking & Analytics (Tasks 3, 4) - 7 hours
   - Production monitoring
   - Usage analytics

3. **Week 4:** Infrastructure (Tasks 5, 6, 7) - 13 hours
   - Server deployment
   - PWA enhancements
   - CI/CD improvements

4. **Week 5+:** Low priority features (Tasks 8-10) - 15 hours
   - Polish and enhancements
   - User-facing improvements

---

## Notes

- All features should be behind feature flags where applicable
- Consider A/B testing for major UI changes
- Analytics should be opt-in for privacy
- E2E tests should run on every PR to main branch
- Unit tests should run on every PR
