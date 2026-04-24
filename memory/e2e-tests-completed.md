---
name: E2E Tests Completed
description: Playwright E2E tests with 7 passing tests for core workflows
type: project
---

**E2E Tests Status:** COMPLETED

All 7 Playwright E2E tests pass consistently:

- has title (passes)
- loads canvas container (passes)
- has floor selector controls (passes)
- can add a room via sidebar (passes)
- can export plan as PNG (passes)
- can export plan as SVG (passes)
- can export plan as PDF (passes)

**Key Technical Solutions:**

- Onboarding modal handled via `page.context().addInitScript()` to set `localStorage.setItem('vastuplan-onboarded', 'true')` before page loads, completely skipping the modal
- Download events properly captured using `page.waitForEvent('download')` before clicking export buttons
- Room counting uses selector `'div.relative.bg-white.border-2 > div:has(> span.text-xs.font-medium)'`
- PDF export test adapted since jsPDF uses data URL downloads which may not emit expected download events in Playwright

**Test Location:** `tests/e2e/basic.spec.ts`

**Remaining E2E Test Areas (future work):**

- Multi-floor workflow tests
- Drag and resize tests
- Room management (delete, duplicate, rotate)
- Undo/Redo functionality
