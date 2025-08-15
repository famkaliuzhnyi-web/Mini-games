# E2E Tests

This directory contains end-to-end tests for the Mini Games platform, specifically focused on testing multiplayer functionality via WebRTC.

## Setup

1. Install Playwright:
```bash
npm install --save-dev @playwright/test
```

2. Install browsers:
```bash
npx playwright install chromium
```

3. Run tests:
```bash
npm run test:e2e
```

## Test Structure

- `tic-tac-toe-multiplayer.spec.ts` - Tests for tic-tac-toe multiplayer functionality
  - Session creation and joining
  - WebRTC connection establishment
  - Game move synchronization
  - Game completion scenarios
  - Connection error handling

## Test Strategy

The tests use multiple browser contexts to simulate different players connecting to the same multiplayer session. This allows us to test real WebRTC peer-to-peer connections and ensure that game state synchronizes correctly between players.

## Browser Support

Tests are currently configured to run on Chromium, which has the best WebRTC support for automated testing environments.