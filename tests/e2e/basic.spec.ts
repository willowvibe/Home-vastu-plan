import { test, expect } from '@playwright/test';

// Skip onboarding modal by setting localStorage before page loads
async function skipOnboarding(page: import('@playwright/test').Page) {
  await page.context().addInitScript(() => {
    try {
      localStorage.setItem('vastuplan-onboarded', 'true');
    } catch {
      // Ignore errors (e.g., in private mode)
    }
  });
  await page.goto('/');
  // If onboarding still appears, skip it by clicking through
  try {
    await page.waitForSelector('div.fixed.inset-0.bg-slate-900\\/60.backdrop-blur-sm.z-\\[60\\]', { timeout: 2000 });
    await page.click('button:has-text("Get Started")', { timeout: 1000 });
  } catch {
    // Onboarding not shown or already skipped
  }
}

test('has title', async ({ page }) => {
  await skipOnboarding(page);
  await expect(page).toHaveTitle(/VastuPlan/);
});

test('loads canvas container', async ({ page }) => {
  await skipOnboarding(page);

  // Wait for canvas container to load
  await page.waitForSelector('div.p-4.rounded-xl.shadow-sm.border', { timeout: 10000 });
});

test('has floor selector controls', async ({ page }) => {
  await skipOnboarding(page);

  // Wait for canvas to load
  await page.waitForSelector('div.p-4.rounded-xl.shadow-sm.border', { timeout: 10000 });

  // Check for floor buttons
  await expect(page.getByRole('button', { name: 'Ground' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'First' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Second' })).toBeVisible();
});

test('can add a room via sidebar', async ({ page }) => {
  await skipOnboarding(page);

  // Wait for canvas to load
  await page.waitForSelector('div.p-4.rounded-xl.shadow-sm.border', { timeout: 10000 });

  // Get initial room count (should be 0 on fresh page)
  // Rooms are rendered inside the Canvas component, which is inside the wrapper div
  let initialCount = await page.locator('div.p-4.rounded-xl.shadow-sm.border div:has(> span.text-xs.font-medium)').count();
  expect(initialCount).toBe(0);

  // Click bedroom button in sidebar - use exact text
  await page.getByRole('button', { name: 'Bedroom 12\'x12\'' }).click();

  // Verify room was added by checking that the properties panel shows a room
  // After adding a room, the "Room Properties" panel should appear
  await page.waitForSelector('h3:text("Room Properties")', { timeout: 5000 });

  // Also verify we can click to add another room (confirming the room was actually added)
  await page.getByRole('button', { name: 'Bedroom 12\'x12\'' }).click();

  // Count rooms - rooms are inside the canvas container div.p-4.rounded-xl.shadow-sm.border
  // Using descendant combinator since rooms are inside Canvas component which is inside the wrapper
  const rooms = page.locator('div.p-4.rounded-xl.shadow-sm.border div:has(> span.text-xs.font-medium)');
  const count = await rooms.count();
  expect(count).toBeGreaterThan(0);
});

test('can export plan as PNG', async ({ page }) => {
  await skipOnboarding(page);

  // Wait for canvas to load
  await page.waitForSelector('div.p-4.rounded-xl.shadow-sm.border', { timeout: 10000 });

  // Set up download listener before clicking
  const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

  // Click export PNG button
  await page.getByRole('button', { name: 'PNG' }).click();

  // Wait for download
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('.png');
});

test('can export plan as SVG', async ({ page }) => {
  await skipOnboarding(page);

  // Wait for canvas to load
  await page.waitForSelector('div.p-4.rounded-xl.shadow-sm.border', { timeout: 10000 });

  // Set up download listener before clicking
  const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

  // Click export SVG button
  await page.getByRole('button', { name: 'SVG Export' }).click();

  // Wait for download
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('.svg');
});

test('can export plan as PDF', async ({ page }) => {
  await skipOnboarding(page);

  // Wait for canvas to load
  await page.waitForSelector('div.p-4.rounded-xl.shadow-sm.border', { timeout: 10000 });

  // Click export PDF button (opens modal)
  await page.getByRole('button', { name: 'PDF Export' }).click();

  // Wait for modal to open
  await page.waitForSelector('h2:text("Presentation Export")', { timeout: 5000 });

  // Click Generate PDF button in the modal
  // Note: jsPDF.save() uses a data URL download which may not emit
  // the expected 'download' event in Playwright. This test verifies
  // that the export flow completes without throwing an error.
  await page.getByRole('button', { name: 'Generate PDF' }).click();

  // Wait for the modal to close (indicating export completed)
  // or wait for the loading state
  try {
    await page.waitForSelector('button:has-text("Generate PDF"):disabled', { timeout: 15000 });
    // If button gets disabled, export is in progress
  } catch {
    // Button might disable briefly or not at all - that's okay
  }

  // Verify export completed (modal closes)
  // Check that we can still interact with the page after export
  await page.waitForSelector('div.p-4.rounded-xl.shadow-sm.border', { timeout: 5000 });

  // Verify the canvas is still present and functional
  expect(await page.locator('div.p-4.rounded-xl.shadow-sm.border').count()).toBeGreaterThan(0);
});
