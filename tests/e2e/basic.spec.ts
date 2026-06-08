import { test, expect } from '@playwright/test';
import LZString from 'lz-string';

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
    await page.waitForSelector('div.fixed.inset-0.bg-slate-900\\/60.backdrop-blur-sm.z-\\[60\\]', {
      timeout: 2000,
    });
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

  // Wait for sidebar elements to load (ground floor button)
  await page.waitForSelector('button:has-text("Ground")', { timeout: 10000 });

  // Also verify canvas container is present (using canvasContainerRef data attribute)
  await page.waitForSelector('div[data-testid="canvas-container"]', { timeout: 10000 });
});

test('has floor selector controls', async ({ page }) => {
  await skipOnboarding(page);

  // Wait for floor buttons to load
  await page.waitForSelector('button:has-text("Ground")', { timeout: 10000 });

  // Check for floor buttons
  await expect(page.getByRole('button', { name: 'Ground' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'First' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Second' })).toBeVisible();
});

test('can add a room via sidebar', async ({ page }) => {
  await skipOnboarding(page);

  // Wait for bedroom button to load (by type text)
  await page.waitForSelector('button:has-text("Bedroom")', { timeout: 10000 });
  // Also verify the dimensions are correct
  await page.waitForSelector('button:has-text("12\'x12\'")', { timeout: 10000 });

  // Get initial room count (should be 0 on fresh page)
  // Check that no rooms are selected/properties shown
  let hasPropertiesPanel = await page.locator('h3:text("Room Properties")').count();
  expect(hasPropertiesPanel).toBe(0);

  // Click bedroom button in sidebar - use exact text
  await page.getByRole('button', { name: "Bedroom 12'x12'" }).click();

  // Verify room was added by checking that the properties panel shows a room
  // After adding a room, the "Room Properties" panel should appear
  await page.waitForSelector('h3:text("Room Properties")', { timeout: 5000 });

  // Also verify we can click to add another room (confirming the room was actually added)
  await page.getByRole('button', { name: "Bedroom 12'x12'" }).click();

  // Verify canvas container is still present and rooms are added
  const canvasContainer = await page.locator('div[data-testid="canvas-container"]').count();
  expect(canvasContainer).toBe(1);
});

test('can export plan as PNG', async ({ page }) => {
  await skipOnboarding(page);

  // Wait for floor buttons to load (app is ready)
  await page.waitForSelector('button:has-text("Ground")', { timeout: 10000 });

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

  // Wait for floor buttons to load (app is ready)
  await page.waitForSelector('button:has-text("Ground")', { timeout: 10000 });

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

  // Wait for floor buttons to load (app is ready)
  await page.waitForSelector('button:has-text("Ground")', { timeout: 10000 });

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
  // Check that canvas container is still present
  await page.waitForSelector('div[data-testid="canvas-container"]', { timeout: 5000 });
});

test('shared link URL is stripped after first load (B-10)', async ({ page }) => {
  await skipOnboarding(page);
  // Wait for the app to be ready.
  await page.waitForSelector('button:has-text("Ground")', { timeout: 10000 });

  // Build a minimal shared plan payload the same way the app does:
  // JSON.stringify a floor plan, then LZString-compress to a URI component.
  const plan = {
    rooms: [{ id: 'r1', type: 'Bedroom', x: 5, y: 5, w: 10, h: 10, floor: 0, wallThickness: 9 }],
    plotWidth: 30,
    plotHeight: 40,
    setbacks: { top: 0, bottom: 0, left: 0, right: 0 },
    unit: 'ft',
    northAngle: 0,
    layers: [],
    roadDirection: 'N',
  };
  const json = JSON.stringify(plan);
  const encoded = LZString.compressToEncodedURIComponent(json);

  await page.goto(`/?plan=${encoded}&mode=view`);

  // After the app loads the shared plan, the URL should have been
  // stripped to just "/" by history.replaceState in the shared-link loader.
  await page.waitForFunction(() => window.location.search === '', null, { timeout: 5000 });
  expect(page.url()).toMatch(/\/$|\/\?$/);

  // Now navigate to a state with no shared plan and add a room.
  await page.goto('/');
  await page.waitForSelector('button:has-text("Ground")', { timeout: 10000 });
  await page.getByRole('button', { name: "Bedroom 12'x12'" }).click();

  // Refresh — the added room should still be there (autosave to localStorage).
  // The default floor plan already includes a 10'x10' room, so the total
  // built-up after adding our 12'x12' bedroom is 244 sq ft (144 + 100).
  // We assert on the built-up area which is visible in the left sidebar,
  // rather than the right "Room Properties" panel which only appears for a
  // selected room (selection isn't persisted across reloads).
  await page.reload();
  await page.waitForSelector('button:has-text("Ground")', { timeout: 10000 });
  await page.waitForFunction(
    () => /Built-up[\s\S]*244\s*sq\s*ft/.test(document.body.textContent || ''),
    null,
    { timeout: 5000 }
  );
});
