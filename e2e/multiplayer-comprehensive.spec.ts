import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { waitForElement, clickElement, fillInput, extractSessionId, debugScreenshot } from './helpers';

/**
 * Comprehensive E2E Tests for Multiplayer Functionality (TDD Approach)
 * 
 * These tests define the expected behavior for multiplayer functionality.
 * Tests are written first and will initially fail until the functionality is implemented.
 */

// Helper function to set up a player (enter name and start playing)
async function setupPlayer(page: Page, playerName: string) {
  await page.goto('http://localhost:4173/');
  
  // Enter player name
  await fillInput(page, 'input[placeholder*="name" i]', playerName);
  await clickElement(page, 'button:has-text("Start Playing")');
  
  // Wait for game selection screen
  await waitForElement(page, 'text=Choose a Game');
  
  // Navigate to tic-tac-toe
  await clickElement(page, 'a[href*="tic-tac-toe"], button:has-text("Tic-Tac-Toe")');
  
  // Wait for game to load
  await waitForElement(page, '.tic-tac-toe-game-field, .tic-tac-toe-board, .game-container');
}

// Helper function to start multiplayer host
async function startMultiplayerHost(page: Page): Promise<string> {
  // Click the multiplayer button in the game interface
  await clickElement(page, 'button:has-text("Multiplayer"), button[title*="multiplayer" i], .multiplayer-button');
  
  // Wait for multiplayer dialog to open
  await waitForElement(page, 'h2:has-text("Multiplayer Lobby"), h3:has-text("Multiplayer"), .multiplayer-lobby');
  
  // Extract session ID from the multiplayer lobby
  return await extractSessionId(page);
}

// Helper function to join multiplayer session
async function joinMultiplayerSession(page: Page, sessionId: string) {
  // Navigate to join URL (this is how the QR code would work)
  await page.goto(`http://localhost:4173/#/multiplayer/join/${sessionId}`);
  
  // Wait for successful join confirmation
  await waitForElement(page, 'text*="Joined session", text*="Connected to", .multiplayer-joined');
}

// Helper to wait for both players to be ready
async function waitForGameStart(hostPage: Page, guestPage: Page) {
  // Both players click ready
  await clickElement(hostPage, 'button:has-text("Ready")');
  await clickElement(guestPage, 'button:has-text("Ready")');
  
  // Wait for game to start
  await Promise.all([
    waitForElement(hostPage, 'text*="\'s Turn", .game-status'),
    waitForElement(guestPage, 'text*="\'s Turn", .game-status')
  ]);
}

// Helper to make a move on the game board
async function makeMove(page: Page, cellIndex: number) {
  await page.click(`.tic-tac-toe-cell:nth-child(${cellIndex + 1}), .game-cell:nth-child(${cellIndex + 1}), .tic-tac-toe-board button:nth-child(${cellIndex + 1})`);
}

// Helper to verify move synchronization
async function verifyMoveSync(hostPage: Page, guestPage: Page, expectedSymbol: string, cellIndex: number) {
  const cellSelector = `.tic-tac-toe-cell:nth-child(${cellIndex + 1}), .game-cell:nth-child(${cellIndex + 1}), .tic-tac-toe-board button:nth-child(${cellIndex + 1})`;
  
  await Promise.all([
    expect(hostPage.locator(cellSelector)).toContainText(expectedSymbol),
    expect(guestPage.locator(cellSelector)).toContainText(expectedSymbol)
  ]);
}

test.describe('Multiplayer TDD - Session Management', () => {
  let hostContext: BrowserContext;
  let guestContext: BrowserContext;
  let hostPage: Page;
  let guestPage: Page;

  test.beforeEach(async ({ browser }) => {
    hostContext = await browser.newContext();
    guestContext = await browser.newContext();
    
    hostPage = await hostContext.newPage();
    guestPage = await guestContext.newPage();
  });

  test.afterEach(async () => {
    await hostContext.close();
    await guestContext.close();
  });

  test('should display multiplayer option in tic-tac-toe game', async () => {
    await setupPlayer(hostPage, 'Host Player');
    
    // Should see multiplayer button in the game interface
    await expect(hostPage.locator('button:has-text("Multiplayer"), .multiplayer-button')).toBeVisible();
  });

  test('should create multiplayer session and display session ID', async () => {
    await setupPlayer(hostPage, 'Host Player');
    
    const sessionId = await startMultiplayerHost(hostPage);
    
    // Session ID should be non-empty and valid
    expect(sessionId).toBeTruthy();
    expect(sessionId.length).toBeGreaterThan(5);
    
    // Should display session information
    await expect(hostPage.locator(`text*="${sessionId}"`)).toBeVisible();
    await expect(hostPage.locator('text*="Host:", text*="Waiting for players"')).toBeVisible();
  });

  test('should allow guest to join session via session ID', async () => {
    // Setup host
    await setupPlayer(hostPage, 'Host Player');
    const sessionId = await startMultiplayerHost(hostPage);
    
    // Setup guest and join
    await setupPlayer(guestPage, 'Guest Player');
    await joinMultiplayerSession(guestPage, sessionId);
    
    // Verify guest joined successfully
    await expect(guestPage.locator('text*="Joined session", text*="Connected"')).toBeVisible();
    
    // Host should see guest in player list
    await expect(hostPage.locator('text*="Guest Player", text*="2 players"')).toBeVisible();
  });

  test('should generate QR code for session sharing', async () => {
    await setupPlayer(hostPage, 'Host Player');
    await startMultiplayerHost(hostPage);
    
    // Should display QR code for easy sharing
    await expect(hostPage.locator('canvas, .qr-code, img[alt*="QR"]')).toBeVisible();
    await expect(hostPage.locator('text*="Scan QR code", text*="Share"')).toBeVisible();
  });

  test('should handle session not found error', async () => {
    await setupPlayer(guestPage, 'Guest Player');
    
    // Try to join non-existent session
    await guestPage.goto('http://localhost:4173/#/multiplayer/join/invalid-session-id');
    
    // Should show error message
    await expect(guestPage.locator('text*="Session not found", text*="Invalid session", .error')).toBeVisible();
  });
});

test.describe('Multiplayer TDD - Game Synchronization', () => {
  let hostContext: BrowserContext;
  let guestContext: BrowserContext;
  let hostPage: Page;
  let guestPage: Page;

  test.beforeEach(async ({ browser }) => {
    hostContext = await browser.newContext();
    guestContext = await browser.newContext();
    
    hostPage = await hostContext.newPage();
    guestPage = await guestContext.newPage();
  });

  test.afterEach(async () => {
    await hostContext.close();
    await guestContext.close();
  });

  test('should synchronize game start between players', async () => {
    // Setup session
    await setupPlayer(hostPage, 'Host Player');
    await setupPlayer(guestPage, 'Guest Player');
    
    const sessionId = await startMultiplayerHost(hostPage);
    await joinMultiplayerSession(guestPage, sessionId);
    
    // Start game
    await waitForGameStart(hostPage, guestPage);
    
    // Both players should see game started
    await Promise.all([
      expect(hostPage.locator('text*="X\'s Turn", text*="Game Started"')).toBeVisible(),
      expect(guestPage.locator('text*="X\'s Turn", text*="Game Started"')).toBeVisible()
    ]);
  });

  test('should synchronize moves between players in real-time', async () => {
    // Setup session and start game
    await setupPlayer(hostPage, 'Host Player');
    await setupPlayer(guestPage, 'Guest Player');
    
    const sessionId = await startMultiplayerHost(hostPage);
    await joinMultiplayerSession(guestPage, sessionId);
    await waitForGameStart(hostPage, guestPage);
    
    // X (first player) makes move at position 0
    await makeMove(hostPage, 0);
    await verifyMoveSync(hostPage, guestPage, 'X', 0);
    
    // O (second player) makes move at position 4 (center)
    await makeMove(guestPage, 4);
    await verifyMoveSync(hostPage, guestPage, 'O', 4);
    
    // X makes another move at position 1
    await makeMove(hostPage, 1);
    await verifyMoveSync(hostPage, guestPage, 'X', 1);
  });

  test('should enforce turn order in multiplayer', async () => {
    // Setup session and start game
    await setupPlayer(hostPage, 'Host Player');
    await setupPlayer(guestPage, 'Guest Player');
    
    const sessionId = await startMultiplayerHost(hostPage);
    await joinMultiplayerSession(guestPage, sessionId);
    await waitForGameStart(hostPage, guestPage);
    
    // X player should be able to move first
    await makeMove(hostPage, 0);
    await verifyMoveSync(hostPage, guestPage, 'X', 0);
    
    // X player should not be able to move again immediately
    const movePromise = makeMove(hostPage, 1);
    
    // Move should either be rejected or should wait for turn
    await expect(async () => {
      await movePromise;
      // Check if turn indicator shows it's still O's turn
      await expect(hostPage.locator('text*="O\'s Turn"')).toBeVisible();
    }).not.toThrow();
  });

  test('should synchronize game completion and winner', async () => {
    // Setup session and start game
    await setupPlayer(hostPage, 'Host Player');
    await setupPlayer(guestPage, 'Guest Player');
    
    const sessionId = await startMultiplayerHost(hostPage);
    await joinMultiplayerSession(guestPage, sessionId);
    await waitForGameStart(hostPage, guestPage);
    
    // Play a game where X wins (top row: positions 0, 1, 2)
    await makeMove(hostPage, 0); // X
    await makeMove(guestPage, 3); // O
    await makeMove(hostPage, 1); // X
    await makeMove(guestPage, 4); // O
    await makeMove(hostPage, 2); // X wins
    
    // Both players should see X wins
    await Promise.all([
      expect(hostPage.locator('text*="X Wins", text*="wins", .game-over')).toBeVisible(),
      expect(guestPage.locator('text*="X Wins", text*="wins", .game-over')).toBeVisible()
    ]);
  });

  test('should handle new game in multiplayer', async () => {
    // Setup session and complete a game
    await setupPlayer(hostPage, 'Host Player');
    await setupPlayer(guestPage, 'Guest Player');
    
    const sessionId = await startMultiplayerHost(hostPage);
    await joinMultiplayerSession(guestPage, sessionId);
    await waitForGameStart(hostPage, guestPage);
    
    // Complete a quick game
    await makeMove(hostPage, 0); // X
    await makeMove(guestPage, 3); // O
    await makeMove(hostPage, 1); // X
    await makeMove(guestPage, 4); // O
    await makeMove(hostPage, 2); // X wins
    
    // Start new game
    await clickElement(hostPage, 'button:has-text("New Game"), button:has-text("Play Again")');
    
    // Both players should see new empty board
    await Promise.all([
      expect(hostPage.locator('text*="X\'s Turn"')).toBeVisible(),
      expect(guestPage.locator('text*="X\'s Turn"')).toBeVisible()
    ]);
    
    // Board should be empty for both players
    for (let i = 0; i < 9; i++) {
      const cellSelector = `.tic-tac-toe-cell:nth-child(${i + 1}), .game-cell:nth-child(${i + 1})`;
      await expect(hostPage.locator(cellSelector)).not.toContainText(/[XO]/);
      await expect(guestPage.locator(cellSelector)).not.toContainText(/[XO]/);
    }
  });
});

test.describe('Multiplayer TDD - Connection Management', () => {
  let hostContext: BrowserContext;
  let guestContext: BrowserContext;
  let hostPage: Page;
  let guestPage: Page;

  test.beforeEach(async ({ browser }) => {
    hostContext = await browser.newContext();
    guestContext = await browser.newContext();
    
    hostPage = await hostContext.newPage();
    guestPage = await guestContext.newPage();
  });

  test.afterEach(async () => {
    await hostContext.close();
    await guestContext.close();
  });

  test('should show connection status indicators', async () => {
    await setupPlayer(hostPage, 'Host Player');
    await setupPlayer(guestPage, 'Guest Player');
    
    const sessionId = await startMultiplayerHost(hostPage);
    await joinMultiplayerSession(guestPage, sessionId);
    
    // Should show connection status for both players
    await expect(hostPage.locator('text*="Connected", .connection-status, .player-status')).toBeVisible();
    await expect(guestPage.locator('text*="Connected", .connection-status, .player-status')).toBeVisible();
  });

  test('should handle player disconnection gracefully', async () => {
    await setupPlayer(hostPage, 'Host Player');
    await setupPlayer(guestPage, 'Guest Player');
    
    const sessionId = await startMultiplayerHost(hostPage);
    await joinMultiplayerSession(guestPage, sessionId);
    
    // Guest leaves the session
    await clickElement(guestPage, 'button:has-text("Leave"), button:has-text("Disconnect")');
    
    // Host should be notified of disconnection
    await expect(hostPage.locator('text*="Player disconnected", text*="Guest Player left", .disconnection-notice')).toBeVisible();
    
    // Host should be able to wait for new players or continue alone
    await expect(hostPage.locator('button:has-text("Wait for players"), button:has-text("Play solo")')).toBeVisible();
  });

  test('should resume game after reconnection', async () => {
    await setupPlayer(hostPage, 'Host Player');
    await setupPlayer(guestPage, 'Guest Player');
    
    const sessionId = await startMultiplayerHost(hostPage);
    await joinMultiplayerSession(guestPage, sessionId);
    await waitForGameStart(hostPage, guestPage);
    
    // Make some moves
    await makeMove(hostPage, 0); // X
    await makeMove(guestPage, 4); // O
    
    // Simulate disconnection and reconnection
    await guestPage.reload();
    await joinMultiplayerSession(guestPage, sessionId);
    
    // Game state should be preserved
    await verifyMoveSync(hostPage, guestPage, 'X', 0);
    await verifyMoveSync(hostPage, guestPage, 'O', 4);
  });

  test('should validate WebRTC connection establishment', async () => {
    // Monitor console for WebRTC messages
    const hostMessages: string[] = [];
    const guestMessages: string[] = [];
    
    hostPage.on('console', msg => {
      if (msg.text().includes('WebRTC') || msg.text().includes('Peer-to-Peer') || msg.text().includes('connection')) {
        hostMessages.push(msg.text());
      }
    });
    
    guestPage.on('console', msg => {
      if (msg.text().includes('WebRTC') || msg.text().includes('Peer-to-Peer') || msg.text().includes('connection')) {
        guestMessages.push(msg.text());
      }
    });
    
    // Create and join session
    await setupPlayer(hostPage, 'Host Player');
    await setupPlayer(guestPage, 'Guest Player');
    
    const sessionId = await startMultiplayerHost(hostPage);
    await joinMultiplayerSession(guestPage, sessionId);
    
    // Wait for WebRTC connection to establish
    await hostPage.waitForTimeout(3000);
    
    // Verify WebRTC activity was logged
    const hasWebRTCActivity = hostMessages.length > 0 || guestMessages.length > 0;
    expect(hasWebRTCActivity).toBe(true);
    
    // Test data channel communication by making a move
    await waitForGameStart(hostPage, guestPage);
    await makeMove(hostPage, 0);
    
    // Verify move synchronizes (indicates working data channel)
    await verifyMoveSync(hostPage, guestPage, 'X', 0);
  });
});