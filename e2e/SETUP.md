# E2E Testing Setup Guide

This guide explains how to set up and run end-to-end tests for the tic-tac-toe multiplayer functionality via WebRTC.

## Prerequisites

1. Node.js 18+ installed
2. npm package manager
3. Project dependencies installed (`npm install`)

## Installation

The e2e testing infrastructure is already configured in the project. To set it up:

1. **Install Playwright** (already included in package.json):
```bash
npm install
```

2. **Install Browser**:
```bash
# For local development
npx playwright install chromium

# For CI environments
npx playwright install --with-deps chromium
```

3. **Start the development server** (required for tests):
```bash
npm run dev
```

## Running Tests

### Basic Commands

```bash
# Run all e2e tests
npm run test:e2e

# Run tests with visible browser (helpful for debugging)
npm run test:e2e:headed

# Run tests in debug mode (step-by-step)
npm run test:e2e:debug

# Run specific test file
npx playwright test e2e/tic-tac-toe-multiplayer.spec.ts
```

### Test Categories

The tic-tac-toe multiplayer tests cover:

1. **Session Management**
   - Creating multiplayer sessions
   - Joining sessions via session ID
   - Player connection/disconnection

2. **WebRTC Communication**
   - Peer-to-peer connection establishment
   - Data channel communication
   - Connection state monitoring

3. **Game Synchronization**
   - Move synchronization between players
   - Turn management
   - Game state consistency

4. **Game Completion**
   - Win/tie detection synchronization
   - Game reset functionality
   - Statistics tracking

## Test Architecture

### Multiple Browser Contexts

Tests use separate browser contexts to simulate different players:
```typescript
const hostContext = await browser.newContext();
const guestContext = await browser.newContext();
```

This allows testing real WebRTC connections between different "users".

### Helper Functions

Common test operations are abstracted into helpers:
- `setupPlayer()` - Initialize player profile and navigate to game
- `startMultiplayerHost()` - Create and start hosting a session
- `joinMultiplayerSession()` - Join existing session by ID
- `waitForWebRTCConnection()` - Validate connection establishment

### Test Flow

1. **Setup**: Two browser contexts (host and guest)
2. **Connection**: Host creates session, guest joins
3. **Gameplay**: Synchronized moves and state updates
4. **Completion**: Game end handling and cleanup

## Troubleshooting

### Browser Installation Issues

If browser installation fails:

1. **Manual Installation**:
```bash
# Try with sudo (Linux/macOS)
sudo npx playwright install chromium

# Or install system-wide
npx playwright install chromium --with-deps
```

2. **Alternative Browsers**:
```bash
# Use webkit if chromium fails
npx playwright install webkit
```

3. **Docker Environment**:
```bash
# For Docker/CI
npx playwright install --with-deps
```

### Test Failures

Common issues and solutions:

1. **Timeouts**: Increase timeout values in test files
2. **WebRTC Issues**: Check browser support and network configuration
3. **Element Not Found**: Verify CSS selectors match current UI
4. **Port Conflicts**: Ensure dev server runs on correct port (5173)

### Debugging

1. **Run with visible browser**:
```bash
npm run test:e2e:headed
```

2. **Enable debug mode**:
```bash
npm run test:e2e:debug
```

3. **Add screenshots in tests**:
```typescript
await page.screenshot({ path: 'debug.png' });
```

4. **Console logging**:
```typescript
page.on('console', msg => console.log(msg.text()));
```

## CI/CD Integration

For automated testing in GitHub Actions:

```yaml
- name: Install Playwright
  run: npm install @playwright/test

- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium

- name: Run E2E tests
  run: npm run test:e2e
```

## Browser Support

Tests are optimized for:
- ✅ **Chromium**: Full WebRTC support
- ⚠️ **Firefox**: Limited WebRTC in headless mode
- ⚠️ **WebKit**: Some WebRTC limitations

Chromium is recommended for comprehensive WebRTC testing.

## Test Results

Test results are generated in:
- `playwright-report/` - HTML test report
- `test-results/` - Screenshots and traces on failure

View the report:
```bash
npx playwright show-report
```

## Contributing

When adding new tests:

1. Follow the existing pattern in `tic-tac-toe-multiplayer.spec.ts`
2. Use helper functions from `e2e/helpers.ts`
3. Add proper error handling and timeouts
4. Test both success and failure scenarios
5. Update this documentation if adding new test categories