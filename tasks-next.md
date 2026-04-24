# Next Set of Tasks - VastuPlan 2D

## Overview

This document lists the next priority tasks for VastuPlan 2D, focused on production readiness, testing, and infrastructure improvements.

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

**Remaining Test Goals:**

- Hook tests: `useFloorPlan` - history management, undo/redo, persistence
- Hook tests: `useCanvasDrag` - drag/resize logic, collision detection
- Component tests: Canvas, Room, VastuGrid, CollaborationPanel
- Utility tests: `src/lib/exports.ts`

---

### 2. Add E2E Tests with Playwright

**Priority:** High  
**Estimated Effort:** 10-15 hours

**Description:**
Create end-to-end tests covering critical user workflows to ensure the app works as expected in real-world scenarios.

**Tasks:**

- Install Playwright and configure for the project
- Create E2E test setup with proper base URLs and timeouts
- Write tests for:
  - **Plan Creation Flow:**
    - User creates a new plan
    - User adds rooms to the canvas
    - User saves the plan to localStorage
  - **Room Management Flow:**
    - User drags and resizes rooms
    - User adds elements to rooms
    - User rotates elements
    - User deletes rooms/elements
    - Undo/Redo functionality
  - **Sharing Flow:**
    - User generates a share link
    - User shares plan in view mode
    - User shares plan in comment mode
  - **Export Flow:**
    - User exports to PNG
    - User exports to SVG
    - User exports to PDF
  - **Multi-Floor Flow:**
    - User switches between floors
    - User adds rooms to different floors
    - User manages floor visibility

**Test Locations:**

- `tests/e2e/plan-creation.spec.ts`
- `tests/e2e/room-management.spec.ts`
- `tests/e2e/sharing.spec.ts`
- `tests/e2e/export.spec.ts`
- `tests/e2e/multi-floor.spec.ts`

---

### 3. Add Error Tracking with Sentry

**Priority:** High  
**Estimated Effort:** 2-3 hours

**Description:**
Integrate Sentry to monitor production errors and track application stability.

**Tasks:**

- Install `@sentry/react` and `@sentry/tracing`
- Initialize Sentry in `main.tsx` with DSN from environment
- Add React integration for better error boundaries
- Configure release tracking
- Add user context to errors (anonymous ID)
- Set up environment-based configuration (enabled in prod only)
- Test error capture locally with Sentry development mode

**Environment Variables Needed:**

```env
SENTRY_DSN=your-sentry-dsn-here
SENTRY_ENVIRONMENT=development|staging|production
```

**Files to Modify:**

- `src/main.tsx` - Sentry initialization
- `src/services/environment.ts` - Environment config
- `.env.example` - Add Sentry variables

---

### 4. Add Analytics with Plausible or PostHog

**Priority:** Medium  
**Estimated Effort:** 3-4 hours

**Description:**
Implement analytics to track feature usage and understand user behavior.

**Tasks:**

- Choose analytics provider (Plausible for privacy-first, PostHog for product analytics)
- Install analytics SDK
- Initialize on app load with user anonymization
- Track key events:
  - `plan_created` - New plan creation
  - `room_added` - Room added with type
  - `room_deleted` - Room deleted
  - `element_added` - Element added
  - `room_dragged` - Room moved
  - `room_resized` - Room resized
  - `element_rotated` - Element rotated
  - `plan_exported` - Export action with format
  - `share_created` - Share link generated
  - `ai_analyzed` - AI analysis triggered
- Add opt-out mechanism for privacy
- Configure data retention policies

**Files to Modify:**

- `src/services/analytics.ts` - New service file
- `src/main.tsx` - Initialize analytics
- `src/App.tsx` - Track events
- `.env.example` - Add analytics variables

---

### 5. Deploy Collaboration Server

**Priority:** Medium  
**Estimated Effort:** 4-6 hours

**Description:**
Deploy the Node.js collaboration server to a hosting provider.

**Tasks:**

- Choose hosting provider (Railway, Cloud Run, or Render)
- Set up CI/CD for server deployment
- Configure production database (Neon PostgreSQL)
- Set up environment variables for production:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `CLIENT_URL`
- Configure SSL/TLS
- Set up health check endpoint
- Configure CORS for production domain
- Set up monitoring/alerting
- Document deployment process in `server/README.md`

**Files to Update:**

- `server/package.json` - Add production scripts
- `.github/workflows/server-deploy.yml` - New workflow
- `server/.env.example` - Production configuration

---

## Medium Priority - Infrastructure Improvements

### 6. Improve PWA Support and Service Worker

**Priority:** Medium  
**Estimated Effort:** 4-6 hours

**Description:**
Enhance PWA capabilities with better offline support and installability.

**Tasks:**

- Update `public/manifest.json`:
  - Add shorter name (12 chars max)
  - Add orientation settings
  - Add display override for installability
  - Add icons for all required sizes (192, 512 px)
- Create service worker with workbox or custom implementation:
  - Cache static assets (HTML, CSS, JS, fonts)
  - Cache plan templates
  - Implement cache-first strategy for assets
  - Implement network-first strategy for API calls
  - Add push notification support (optional)
- Add "Add to Home Screen" prompt
- Implement offline indicator UI
- Test offline functionality with Chrome DevTools

**Files to Modify:**

- `public/manifest.json`
- `src/main.tsx` - Service worker registration
- `src/components/OfflineIndicator.tsx` - New component

---

### 7. Add CI/CD Pipeline Improvements

**Priority:** Medium  
**Estimated Effort:** 3-4 hours

**Description:**
Enhance the existing CI pipeline with additional checks and deployment automation.

**Tasks:**

- Add build cache for faster builds
- Add test reporting to GitHub
- Add coverage threshold checks (min 70%)
- Add security scanning (npm audit, Snyk)
- Add dependency update automation (Dependabot)
- Add staging environment deployment
- Add pull request templates
- Add issue templates for bugs/features

**Files to Modify:**

- `.github/workflows/ci.yml` - Add checks
- `.github/dependabot.yml` - New file
- `.github/PULL_REQUEST_TEMPLATE.md` - New file
- `.github/ISSUE_TEMPLATE/` - New directory with templates

---

## Low Priority - Nice to Have

### 8. Add Keyboard Shortcut Help Enhancement

**Priority:** Low  
**Estimated Effort:** 1-2 hours

**Description:**
Improve the keyboard shortcut help modal with better organization and search.

**Tasks:**

- Categorize shortcuts by function:
  - Navigation
  - Room Management
  - Element Management
  - View Controls
  - Export
- Add search/filter for shortcuts
- Show key combination in sidebar
- Add keyboard shortcut to open help (`?` or `Ctrl+/`)

---

### 9. Add Room Tag Filtering

**Priority:** Low  
**Estimated Effort:** 3-4 hours

**Description:**
Allow filtering rooms by tags in the sidebar.

**Tasks:**

- Add tag filtering to room list
- Add tag-based search
- Show tag count per room
- Quick filter buttons for common tags

---

### 10. Add Plan Comparison Tool

**Priority:** Low  
**Estimated Effort:** 6-8 hours

**Description:**
Create a visual diff tool to compare two plans side by side.

**Tasks:**

- Load two plans from history or project versions
- Show side-by-side or merged view
- Highlight differences:
  - Added rooms (green outline)
  - Removed rooms (red outline)
  - Moved rooms (arrows)
  - Resized rooms (dashed lines)
- Export comparison report

---

## Summary

| Priority  | Tasks  | Estimated Hours | Status          |
| --------- | ------ | --------------- | --------------- |
| High      | 5      | 30 hours        | 🔲 Not Started  |
| Medium    | 3      | 15 hours        | 🔲 Not Started  |
| Low       | 3      | 15 hours        | 🔲 Not Started  |
| **Total** | **11** | **60 hours**    | **0% Complete** |

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
