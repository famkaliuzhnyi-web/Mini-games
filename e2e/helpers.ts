import { type Page, expect } from '@playwright/test';

/**
 * Shared utilities for e2e tests
 */

/**
 * Wait for an element to be visible with better error handling
 */
export async function waitForElement(page: Page, selector: string, timeout = 10000) {
  try {
    await expect(page.locator(selector)).toBeVisible({ timeout });
  } catch (error) {
    console.log(`Element not found: ${selector}`);
    console.log('Current page URL:', page.url());
    console.log('Page title:', await page.title());
    throw error;
  }
}

/**
 * Fill input field with better error handling
 */
export async function fillInput(page: Page, selector: string, value: string) {
  await waitForElement(page, selector);
  await page.fill(selector, value);
}

/**
 * Click element with better error handling
 */
export async function clickElement(page: Page, selector: string) {
  await waitForElement(page, selector);
  await page.click(selector);
}

/**
 * Get session ID from multiplayer lobby
 */
export async function extractSessionId(page: Page): Promise<string> {
  await waitForElement(page, 'text*="Session:"');
  
  const sessionElement = await page.locator('text*="Session:"').first();
  const sessionText = await sessionElement.textContent();
  const sessionId = sessionText?.replace('Session:', '').trim();
  
  if (!sessionId) {
    throw new Error('Could not extract session ID from text: ' + sessionText);
  }
  
  return sessionId;
}

/**
 * Debug helper to take screenshot on failure
 */
export async function debugScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `test-results/debug-${name}.png` });
}

/**
 * Wait for WebRTC connection to establish
 */
export async function waitForWebRTCConnection(hostPage: Page, guestPage: Page) {
  // Wait for both players to show in multiplayer lobby
  await Promise.all([
    expect(hostPage.locator('text*="WebRTC", text*="Peer-to-Peer"')).toBeVisible({ timeout: 15000 }),
    expect(guestPage.locator('text*="WebRTC", text*="Peer-to-Peer"')).toBeVisible({ timeout: 15000 })
  ]);
  
  // Additional wait for connection to stabilize
  await hostPage.waitForTimeout(2000);
}