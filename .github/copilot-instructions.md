# Mini Games Platform - React + TypeScript + Vite

Mini Games is a React + TypeScript web application built with Vite that provides a collection of classic mini-games including 2048, Tetris, Tic-Tac-Toe, Ping Pong, and Sudoku. The platform supports offline play, auto-save functionality, and is deployed as a Progressive Web App (PWA) on GitHub Pages.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap and Build the Repository
- `npm install` -- takes ~45 seconds to complete. NEVER CANCEL. Set timeout to 90+ seconds.
- `npm run lint` -- takes ~2 seconds. Runs ESLint checks and may show warnings (not errors).
- `npm run build` -- takes ~6 seconds to complete. NEVER CANCEL. Set timeout to 120+ seconds.
  - Runs TypeScript compilation, updates PWA manifest, Vite build, restores PWA assets, and post-build processing
  - Creates optimized production bundle in `dist/` directory
  - Includes service worker updates for proper PWA caching

### Development Workflow
- ALWAYS run `npm install` first before any development work.
- Start development server: `npm run dev` -- starts instantly (~200ms) on http://localhost:5173/
  - Hot Module Replacement (HMR) enabled for fast development
  - Automatically opens browser (if configured)
  - NEVER CANCEL - runs continuously during development
- Preview production build: `npm run preview` -- runs on http://localhost:4173/
- Build for production: `npm run build` -- creates optimized bundle in `dist/`

### Linting and Code Quality
- Always run `npm run lint` before committing changes or the GitHub Actions CI will fail.
- Lint command may show warnings (acceptable) but should not show errors.
- Common warnings include React Hook dependency issues which are typically non-blocking.
- ESLint configuration is in `eslint.config.js` with TypeScript and React rules.

## Validation Requirements

### Manual Functionality Testing
ALWAYS manually validate the application by running through complete user scenarios:

1. **Basic App Flow**:
   - Navigate to http://localhost:5173/
   - Enter a player name (e.g., "TestPlayer")
   - Click "Start Playing" to access game selection

2. **Game Testing**:
   - Test at least 2 different games from: 2048, Tetris, Tic-Tac-Toe, Ping Pong, Sudoku
   - For Tic-Tac-Toe: Click cells to place X/O markers, verify turn switching
   - For Sudoku: Verify 9x9 grid loads, number input works (1-9), hint system available
   - Verify auto-save functionality works (✅ Saved indicator appears)
   - Test "New Game" and "Save/Load" buttons

3. **Navigation Testing**:
   - Use "🏠 Games" button to return to game selection
   - Verify player profile shows correct name and coin balance (🪙 100)
   - Test PWA install prompt functionality

### Build Validation
- Always build and test the production version: `npm run build && npm run preview`
- Verify all games work correctly in production build
- Check that PWA assets are properly generated in `dist/` directory

## Common Tasks

### Repository Structure
Key directories and files:
```
/
├── .github/workflows/deploy.yml    # GitHub Actions deployment
├── src/
│   ├── games/                      # Individual game implementations
│   │   ├── game2048/              # 2048 game
│   │   ├── ping-pong/             # Ping Pong game
│   │   ├── sudoku/                # Sudoku game
│   │   ├── tetris/                # Tetris game
│   │   └── tic-tac-toe/           # Tic-Tac-Toe game
│   ├── components/                 # Shared React components
│   ├── services/                   # Platform services (GameSave, PWA, etc.)
│   ├── hooks/                     # Shared React hooks
│   └── utils/                     # Utility functions
├── public/                        # Static assets and PWA files
├── scripts/                       # Build and deployment scripts
├── package.json                   # Dependencies and scripts
├── vite.config.ts                # Vite configuration
└── tsconfig.json                 # TypeScript configuration
```

### Game Development
Each game follows a consistent structure under `src/games/[game-name]/`:
- `components/` - React UI components
- `hooks/` - Game-specific React hooks
- `logic/` - Pure TypeScript game logic
- `types/` - TypeScript type definitions
- `utils/` - Game utility functions
- `SlotComponents.tsx` - Main game integration component

### Environment Setup
- **Node.js**: Requires Node.js 18+ (configured in GitHub Actions with Node 20)
- **Package Manager**: Uses npm (not yarn or pnpm)
- **Development**: Vite development server with HMR
- **Build**: TypeScript + Vite with custom build pipeline
- **Deployment**: GitHub Pages via GitHub Actions

### CI/CD Pipeline
GitHub Actions workflow (`.github/workflows/deploy.yml`):
1. **Build Job**: `npm ci` → `npm run build` → Upload artifacts
2. **Deploy Job**: Deploy to GitHub Pages
3. Triggers on push to `main` branch or manual dispatch
4. Uses Node.js 20 and Ubuntu latest
5. **Expected Build Time**: ~2-3 minutes total for CI/CD

### PWA Features
The application is a Progressive Web App with:
- Service worker (`public/sw.js`) for offline functionality
- Web app manifest (`public/manifest.json`) for installation
- Auto-save game progress using IndexedDB
- Install prompt functionality
- Multiple icon sizes for different devices

## Debugging Common Issues

### Build Errors
- **TypeScript errors**: Check `tsconfig.json` and fix type issues
- **Import errors**: Verify file paths and exports
- **PWA asset errors**: Run `npm run restore-pwa-assets` if needed

### Development Issues
- **Hot reload not working**: Restart dev server with `npm run dev`
- **Port conflicts**: Check if port 5173 (dev) or 4173 (preview) is in use
- **Service worker issues**: Clear browser cache and reload

### Game Integration
- **New games**: Follow the pattern in existing games under `src/games/`
- **Auto-save issues**: Verify game implements proper save/load hooks
- **State management**: Use React hooks pattern with TypeScript

## Key Implementation Details

### Build Process Timing
Based on validation testing:
- `npm install`: ~45 seconds
- `npm run lint`: ~2 seconds  
- `npm run build`: ~6 seconds
- `npm run dev`: ~200ms startup
- Total CI/CD: ~2-3 minutes

### Testing Status
- **Unit tests**: Not currently implemented (framework shows Vitest setup in docs)
- **Manual testing**: Required for all changes
- **Browser compatibility**: Tested in modern browsers
- **Mobile responsiveness**: Fully responsive design

### Performance Expectations
- Development server starts in under 1 second
- Build process completes in under 10 seconds
- Games run at 60 FPS with proper optimization
- PWA functionality provides offline capabilities

Always test your changes thoroughly using the validation scenarios above before submitting pull requests.