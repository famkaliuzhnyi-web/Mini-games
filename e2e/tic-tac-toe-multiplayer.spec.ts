import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * E2E Tests for Tic-Tac-Toe Multiplayer via WebRTC
 * 
 * These tests validate the complete multiplayer flow:
 * 1. Host creates a multiplayer session
 * 2. Guest joins the session via session ID
 * 3. WebRTC connection is established between players
 * 4. Game moves are synchronized between players
 * 5. Game completion is handled correctly
 */

// Helper function to set up a player (enter name and start playing)
async function setupPlayer(page: Page, playerName: string) {
  await page.goto('/');
  
  // Enter player name
  await page.fill('input[placeholder*="name" i]', playerName);
  await page.click('button:has-text("Start Playing")');
  
  // Wait for game selection screen
  await expect(page.locator('text=Choose a Game')).toBeVisible({ timeout: 10000 });
  
  // Navigate to tic-tac-toe
  await page.click('a[href*="tic-tac-toe"], button:has-text("Tic-Tac-Toe")');
  
  // Wait for game to load
  await expect(page.locator('.tic-tac-toe-game-field, .tic-tac-toe-board')).toBeVisible({ timeout: 10000 });
}

// Helper function to start multiplayer host
async function startMultiplayerHost(page: Page): Promise<string> {
  // Click the + multiplayer button in the top navigation
  await page.click('button[title*="multiplayer" i], button[aria-label*="multiplayer" i], nav button:has-text("+")');
  
  // Wait for multiplayer dialog to open
  await expect(page.locator('heading:has-text("Multiplayer Lobby")')).toBeVisible({ timeout: 10000 });
  
  // Extract session ID from the multiplayer lobby
  const sessionElement = await page.locator('text*="Session:"').first();
  const sessionText = await sessionElement.textContent();
  const sessionId = sessionText?.replace('Session:', '').trim();
  
  if (!sessionId) {
    throw new Error('Could not extract session ID from: ' + sessionText);
  }
  
  return sessionId;
}

// Helper function to join multiplayer session
async function joinMultiplayerSession(page: Page, sessionId: string) {
  // Navigate to join URL (this is how the QR code would work)
  await page.goto(`/#/multiplayer/join/${sessionId}`);
  
  // Wait for successful join
  await expect(page.locator('text*="Connected" i, text*="Multiplayer Lobby"')).toBeVisible({ timeout: 15000 });
}

test.describe('Tic-Tac-Toe Multiplayer WebRTC', () => {
  let hostContext: BrowserContext;
  let guestContext: BrowserContext;
  let hostPage: Page;
  let guestPage: Page;

  test.beforeEach(async ({ browser }) => {
    // Create separate browser contexts for host and guest to simulate different users
    hostContext = await browser.newContext();
    guestContext = await browser.newContext();
    
    hostPage = await hostContext.newPage();
    guestPage = await guestContext.newPage();
  });

  test.afterEach(async () => {
    await hostContext.close();
    await guestContext.close();
  });

  test('should create and join a multiplayer session', async () => {
    // Setup host player
    await setupPlayer(hostPage, 'Host Player');
    
    // Setup guest player in parallel
    await setupPlayer(guestPage, 'Guest Player');
    
    // Host creates multiplayer session
    const sessionId = await startMultiplayerHost(hostPage);
    
    // Guest joins the session via the join URL (simulating QR code scan)
    await joinMultiplayerSession(guestPage, sessionId);
    
    // Verify both players see each other in the lobby
    await expect(hostPage.locator('text*="2 / 4 players", text*="Guest Player"')).toBeVisible({ timeout: 10000 });
    await expect(guestPage.locator('text*="2 / 4 players", text*="Host Player"')).toBeVisible({ timeout: 10000 });
    
    // Verify session information is displayed
    await expect(hostPage.locator(`text*="${sessionId}"`)).toBeVisible();
    await expect(guestPage.locator(`text*="${sessionId}"`)).toBeVisible();
    
    // Verify WebRTC connection status
    await expect(hostPage.locator('text*="WebRTC", text*="connected"')).toBeVisible();
    await expect(guestPage.locator('text*="WebRTC", text*="connected"')).toBeVisible();
  });

  test('should synchronize game moves between players', async () => {
    // Setup both players
    await setupPlayer(hostPage, 'Host Player');
    await setupPlayer(guestPage, 'Guest Player');
    
    // Create and join session
    const sessionId = await startMultiplayerHost(hostPage);
    await joinMultiplayerSession(guestPage, sessionId);
    
    // Close multiplayer dialog and start playing the game
    await hostPage.click('button:has-text("✕")'); // Close dialog
    await guestPage.click('button:has-text("✕")'); // Close dialog
    
    // Both players should be ready to play tic-tac-toe
    await expect(hostPage.locator('text*="X\'s Turn", text*="O\'s Turn"')).toBeVisible({ timeout: 10000 });
    await expect(guestPage.locator('text*="X\'s Turn", text*="O\'s Turn"')).toBeVisible({ timeout: 10000 });
    
    // Host makes first move (should be X)
    const hostCells = hostPage.locator('.tic-tac-toe-board button, .tic-tac-toe-game-field button');
    await hostCells.first().click();
    
    // Verify move appears on both players' boards
    await expect(hostPage.locator('.tic-tac-toe-board, .tic-tac-toe-game-field')).toContainText('X');
    await expect(guestPage.locator('.tic-tac-toe-board, .tic-tac-toe-game-field')).toContainText('X', { timeout: 5000 });
    
    // Verify turn changes to O
    await expect(hostPage.locator('text*="O\'s Turn"')).toBeVisible({ timeout: 5000 });
    await expect(guestPage.locator('text*="O\'s Turn"')).toBeVisible({ timeout: 5000 });
    
    // Guest makes second move (should be O)
    const guestCells = guestPage.locator('.tic-tac-toe-board button:not(:has-text("X")), .tic-tac-toe-game-field button:not(:has-text("X"))');
    await guestCells.first().click();
    
    // Verify both moves are synchronized
    await expect(hostPage.locator('.tic-tac-toe-board, .tic-tac-toe-game-field')).toContainText('O', { timeout: 5000 });
    await expect(guestPage.locator('.tic-tac-toe-board, .tic-tac-toe-game-field')).toContainText('O');
    
    // Verify turn changes back to X
    await expect(hostPage.locator('text*="X\'s Turn"')).toBeVisible({ timeout: 5000 });
    await expect(guestPage.locator('text*="X\'s Turn"')).toBeVisible({ timeout: 5000 });
  });

  test('should handle game completion correctly', async () => {
    // Setup both players
    await setupPlayer(hostPage, 'Host Player');
    await setupPlayer(guestPage, 'Guest Player');
    
    // Create and join session
    const sessionId = await startMultiplayerHost(hostPage);
    await joinMultiplayerSession(guestPage, sessionId);
    
    // Start the game
    await hostPage.click('button:has-text("Ready")');
    await guestPage.click('button:has-text("Ready")');
    
    // Wait for game to start
    await expect(hostPage.locator('text*="X\'s Turn", text*="O\'s Turn"')).toBeVisible({ timeout: 10000 });
    
    // Play moves to create a winning scenario
    // X wins with top row: X-X-X
    const hostCells = hostPage.locator('.tic-tac-toe-cell-slot, .tic-tac-toe-board button');
    const guestCells = guestPage.locator('.tic-tac-toe-cell-slot, .tic-tac-toe-board button');
    
    // X (host) plays top-left [0,0]
    await hostCells.nth(0).click();
    await expect(guestPage.locator('.tic-tac-toe-board')).toContainText('X');
    
    // O (guest) plays center [1,1]
    await guestCells.nth(4).click();
    await expect(hostPage.locator('.tic-tac-toe-board')).toContainText('O');
    
    // X (host) plays top-center [0,1]
    await hostCells.nth(1).click();
    await expect(guestPage.locator('.tic-tac-toe-board')).toContainText('X');
    
    // O (guest) plays bottom-left [2,0]
    await guestCells.nth(6).click();
    await expect(hostPage.locator('.tic-tac-toe-board')).toContainText('O');
    
    // X (host) plays top-right [0,2] to win
    await hostCells.nth(2).click();
    
    // Verify game completion is synchronized on both sides
    await expect(hostPage.locator('text*="X Wins"')).toBeVisible({ timeout: 5000 });
    await expect(guestPage.locator('text*="X Wins"')).toBeVisible({ timeout: 5000 });
    
    // Verify both players can start a new game
    await hostPage.click('button:has-text("New Game")');
    await expect(hostPage.locator('text*="X\'s Turn"')).toBeVisible({ timeout: 5000 });
    await expect(guestPage.locator('text*="X\'s Turn"')).toBeVisible({ timeout: 5000 });
  });

  test('should handle player disconnection', async () => {
    // Setup both players
    await setupPlayer(hostPage, 'Host Player');
    await setupPlayer(guestPage, 'Guest Player');
    
    // Create and join session
    const sessionId = await startMultiplayerHost(hostPage);
    await joinMultiplayerSession(guestPage, sessionId);
    
    // Verify connection
    await expect(hostPage.locator('text*="Guest Player"')).toBeVisible({ timeout: 10000 });
    await expect(guestPage.locator('text*="Host Player"')).toBeVisible({ timeout: 10000 });
    
    // Guest disconnects by leaving the session
    await guestPage.click('button:has-text("Leave"), button:has-text("Leave Multiplayer")');
    
    // Verify host detects the disconnection
    // The specific UI for disconnection may vary, but generally the guest should no longer appear
    // or there should be a disconnect notification
    await expect(hostPage.locator('text*="Guest Player"')).not.toBeVisible({ timeout: 10000 });
    
    // Host should be able to continue or create a new session
    await expect(hostPage.locator('button:has-text("Multiplayer")')).toBeVisible({ timeout: 5000 });
  });

  test('should validate WebRTC connection establishment', async () => {
    // Setup both players
    await setupPlayer(hostPage, 'Host Player');
    await setupPlayer(guestPage, 'Guest Player');
    
    // Monitor console for WebRTC connection messages
    const hostMessages: string[] = [];
    const guestMessages: string[] = [];
    
    hostPage.on('console', msg => {
      if (msg.text().includes('WebRTC') || msg.text().includes('connection')) {
        hostMessages.push(msg.text());
      }
    });
    
    guestPage.on('console', msg => {
      if (msg.text().includes('WebRTC') || msg.text().includes('connection')) {
        guestMessages.push(msg.text());
      }
    });
    
    // Create and join session
    const sessionId = await startMultiplayerHost(hostPage);
    await joinMultiplayerSession(guestPage, sessionId);
    
    // Wait a moment for WebRTC connection to establish
    await hostPage.waitForTimeout(3000);
    
    // Verify connection indicators are present
    await expect(hostPage.locator('text*="Connected", text*="Ready"')).toBeVisible({ timeout: 10000 });
    await expect(guestPage.locator('text*="Connected", text*="Ready"')).toBeVisible({ timeout: 10000 });
    
    // Make a move to test data channel communication
    await hostPage.click('button:has-text("Ready")');
    await guestPage.click('button:has-text("Ready")');
    
    // Wait for game to start and make a move
    await expect(hostPage.locator('text*="Turn"')).toBeVisible({ timeout: 10000 });
    await hostPage.click('.tic-tac-toe-cell-slot:first-child, .tic-tac-toe-board button:first-child');
    
    // Verify move synchronizes (indicates working data channel)
    await expect(guestPage.locator('.tic-tac-toe-board')).toContainText('X', { timeout: 5000 });
  });
});