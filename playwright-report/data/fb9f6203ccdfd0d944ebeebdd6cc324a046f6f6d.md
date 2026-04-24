# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: basic.spec.ts >> can add a room via sidebar
- Location: tests/e2e/basic.spec.ts:46:1

# Error details

```
TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('div.p-4.rounded-xl.shadow-sm.border') to be visible

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - img [ref=e6]
  - heading "Something went wrong" [level=1] [ref=e8]
  - paragraph [ref=e9]: We apologize for the inconvenience. Your floor plan data is safely stored in your browser.
  - paragraph [ref=e11]: Cannot access 'showOnboarding' before initialization
  - generic [ref=e12]:
    - button "Try Again" [ref=e13]:
      - img [ref=e14]
      - text: Try Again
    - button "Go to Home" [ref=e19]:
      - img [ref=e20]
      - text: Go to Home
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | // Skip onboarding modal by setting localStorage before page loads
  4   | async function skipOnboarding(page: import('@playwright/test').Page) {
  5   |   await page.context().addInitScript(() => {
  6   |     try {
  7   |       localStorage.setItem('vastuplan-onboarded', 'true');
  8   |     } catch {
  9   |       // Ignore errors (e.g., in private mode)
  10  |     }
  11  |   });
  12  |   await page.goto('/');
  13  |   // If onboarding still appears, skip it by clicking through
  14  |   try {
  15  |     await page.waitForSelector('div.fixed.inset-0.bg-slate-900\\/60.backdrop-blur-sm.z-\\[60\\]', { timeout: 2000 });
  16  |     await page.click('button:has-text("Get Started")', { timeout: 1000 });
  17  |   } catch {
  18  |     // Onboarding not shown or already skipped
  19  |   }
  20  | }
  21  | 
  22  | test('has title', async ({ page }) => {
  23  |   await skipOnboarding(page);
  24  |   await expect(page).toHaveTitle(/VastuPlan/);
  25  | });
  26  | 
  27  | test('loads canvas container', async ({ page }) => {
  28  |   await skipOnboarding(page);
  29  | 
  30  |   // Wait for canvas container to load
  31  |   await page.waitForSelector('div.p-4.rounded-xl.shadow-sm.border', { timeout: 10000 });
  32  | });
  33  | 
  34  | test('has floor selector controls', async ({ page }) => {
  35  |   await skipOnboarding(page);
  36  | 
  37  |   // Wait for canvas to load
  38  |   await page.waitForSelector('div.p-4.rounded-xl.shadow-sm.border', { timeout: 10000 });
  39  | 
  40  |   // Check for floor buttons
  41  |   await expect(page.getByRole('button', { name: 'Ground' })).toBeVisible();
  42  |   await expect(page.getByRole('button', { name: 'First' })).toBeVisible();
  43  |   await expect(page.getByRole('button', { name: 'Second' })).toBeVisible();
  44  | });
  45  | 
  46  | test('can add a room via sidebar', async ({ page }) => {
  47  |   await skipOnboarding(page);
  48  | 
  49  |   // Wait for canvas to load
> 50  |   await page.waitForSelector('div.p-4.rounded-xl.shadow-sm.border', { timeout: 10000 });
      |              ^ TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
  51  | 
  52  |   // Get initial room count (should be 0 on fresh page)
  53  |   // Rooms are rendered inside the Canvas component, which is inside the wrapper div
  54  |   let initialCount = await page.locator('div.p-4.rounded-xl.shadow-sm.border div:has(> span.text-xs.font-medium)').count();
  55  |   expect(initialCount).toBe(0);
  56  | 
  57  |   // Click bedroom button in sidebar - use exact text
  58  |   await page.getByRole('button', { name: 'Bedroom 12\'x12\'' }).click();
  59  | 
  60  |   // Verify room was added by checking that the properties panel shows a room
  61  |   // After adding a room, the "Room Properties" panel should appear
  62  |   await page.waitForSelector('h3:text("Room Properties")', { timeout: 5000 });
  63  | 
  64  |   // Also verify we can click to add another room (confirming the room was actually added)
  65  |   await page.getByRole('button', { name: 'Bedroom 12\'x12\'' }).click();
  66  | 
  67  |   // Count rooms - rooms are inside the canvas container div.p-4.rounded-xl.shadow-sm.border
  68  |   // Using descendant combinator since rooms are inside Canvas component which is inside the wrapper
  69  |   const rooms = page.locator('div.p-4.rounded-xl.shadow-sm.border div:has(> span.text-xs.font-medium)');
  70  |   const count = await rooms.count();
  71  |   expect(count).toBeGreaterThan(0);
  72  | });
  73  | 
  74  | test('can export plan as PNG', async ({ page }) => {
  75  |   await skipOnboarding(page);
  76  | 
  77  |   // Wait for canvas to load
  78  |   await page.waitForSelector('div.p-4.rounded-xl.shadow-sm.border', { timeout: 10000 });
  79  | 
  80  |   // Set up download listener before clicking
  81  |   const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
  82  | 
  83  |   // Click export PNG button
  84  |   await page.getByRole('button', { name: 'PNG' }).click();
  85  | 
  86  |   // Wait for download
  87  |   const download = await downloadPromise;
  88  |   expect(download.suggestedFilename()).toContain('.png');
  89  | });
  90  | 
  91  | test('can export plan as SVG', async ({ page }) => {
  92  |   await skipOnboarding(page);
  93  | 
  94  |   // Wait for canvas to load
  95  |   await page.waitForSelector('div.p-4.rounded-xl.shadow-sm.border', { timeout: 10000 });
  96  | 
  97  |   // Set up download listener before clicking
  98  |   const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
  99  | 
  100 |   // Click export SVG button
  101 |   await page.getByRole('button', { name: 'SVG Export' }).click();
  102 | 
  103 |   // Wait for download
  104 |   const download = await downloadPromise;
  105 |   expect(download.suggestedFilename()).toContain('.svg');
  106 | });
  107 | 
  108 | test('can export plan as PDF', async ({ page }) => {
  109 |   await skipOnboarding(page);
  110 | 
  111 |   // Wait for canvas to load
  112 |   await page.waitForSelector('div.p-4.rounded-xl.shadow-sm.border', { timeout: 10000 });
  113 | 
  114 |   // Click export PDF button (opens modal)
  115 |   await page.getByRole('button', { name: 'PDF Export' }).click();
  116 | 
  117 |   // Wait for modal to open
  118 |   await page.waitForSelector('h2:text("Presentation Export")', { timeout: 5000 });
  119 | 
  120 |   // Click Generate PDF button in the modal
  121 |   // Note: jsPDF.save() uses a data URL download which may not emit
  122 |   // the expected 'download' event in Playwright. This test verifies
  123 |   // that the export flow completes without throwing an error.
  124 |   await page.getByRole('button', { name: 'Generate PDF' }).click();
  125 | 
  126 |   // Wait for the modal to close (indicating export completed)
  127 |   // or wait for the loading state
  128 |   try {
  129 |     await page.waitForSelector('button:has-text("Generate PDF"):disabled', { timeout: 15000 });
  130 |     // If button gets disabled, export is in progress
  131 |   } catch {
  132 |     // Button might disable briefly or not at all - that's okay
  133 |   }
  134 | 
  135 |   // Verify export completed (modal closes)
  136 |   // Check that we can still interact with the page after export
  137 |   await page.waitForSelector('div.p-4.rounded-xl.shadow-sm.border', { timeout: 5000 });
  138 | 
  139 |   // Verify the canvas is still present and functional
  140 |   expect(await page.locator('div.p-4.rounded-xl.shadow-sm.border').count()).toBeGreaterThan(0);
  141 | });
  142 | 
```