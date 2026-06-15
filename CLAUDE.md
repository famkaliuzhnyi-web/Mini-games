# Mini Games — Platform Guide

## Stack

React 19 + TypeScript 5.8 (`erasableSyntaxOnly` — no constructor parameter properties), Vite 7, Firebase Realtime DB for WebRTC signalling. Deploy: push to `main` → GitHub Actions → GitHub Pages.

---

## Adding a game

1. Create `src/games/<id>/` with:
   - `<Name>.tsx` — the React component (`playerId: string, playerName: string` props)
   - `<Name>.game.ts` — implements `IGame<TState, TAction>` from `src/games/_contract/IGame.ts`
   - `<Name>.css`
   - `types.ts`, `gameLogic.ts`, `index.ts`
2. Register in `src/components/game/GameContainer.tsx` (new `case` in the switch).
3. Add an entry to `AVAILABLE_GAMES` in `src/components/game/GamesList.tsx`.

### IGame contract

```ts
interface IGame<TState, TAction> {
  id: string;
  initialState(players: Player[]): TState;
  reduce(state: TState, action: TAction, from: Player): TState | null;
  canAct(state: TState, playerId: string): boolean;
  validateSnapshot(raw: unknown): TState;   // throw on invalid
}
```

`reduce` returns `null` to signal "action rejected, no state change".

---

## Multiplayer

Host-authoritative star topology. The host runs the game loop and broadcasts full state snapshots to all guests after every tick or action.

```ts
const session = useSession();
const isHost = !session.isInSession || session.role === 'host';
```

**Host pattern**
```ts
// Apply action and push state to all peers
session.broadcastSnapshot(gameId, nextState);

// Respond to late-joiner snapshot requests
session.manager.on('game-snapshot-requested', ({ gameId, fromPeerId }) => {
  session.sendSnapshot(gameId, currentState, fromPeerId);
});

// Receive guest actions
session.manager.on('game-action', ({ gameId, action, from }) => { ... });
```

**Guest pattern**
```ts
// Pull current state on mount
session.requestSnapshot(gameId);

// Receive state from host
session.manager.on('game-snapshot', ({ gameId, state }) => { ... });

// Send actions to host
session.sendAction(gameId, action);
```

Use a `useRef` to hold authoritative state in the host game-loop to avoid stale closures in `setInterval`.

---

## Touch events — critical rules

### Problem

`useSwipeGestures` registers a **non-passive** `touchstart` listener when `preventDefault: true`. On Android, calling `preventDefault()` in a touchstart listener suppresses the browser's synthetic `click` event — making any `<button onClick={...}>` inside the swipe container appear dead.

### Platform-level fix (already in place)

`useSwipeGestures` automatically excludes `button, a, input, select, textarea, [role="button"]` from `preventDefault` and swipe tracking. You do **not** need to add `excludeSelector` for standard interactive elements.

### Use `GameButton` for all action buttons inside games

```tsx
import { GameButton } from '../../components/ui';

// ✅ correct — fires on pointerdown, stops propagation
<GameButton className="my-btn" onClick={handleStart}>Play</GameButton>

// ❌ wrong — onClick may be silenced by ancestor swipe handler on mobile
<button className="my-btn" onClick={handleStart}>Play</button>
```

`GameButton` is a drop-in `<button>` replacement that uses `onPointerDown` + `stopPropagation` internally, so it is immune to ancestor touch-event interference. Use it for every action button inside a game container.

D-pad buttons should use `onPointerDown` directly (they're simple enough not to need the component):
```tsx
<button onPointerDown={() => changeDirection('up')}>↑</button>
```

### Swipe setup

```ts
useSwipeGestures(containerRef, {
  onSwipeUp:    () => move('up'),
  onSwipeDown:  () => move('down'),
  onSwipeLeft:  () => move('left'),
  onSwipeRight: () => move('right'),
  minSwipeDistance: 25,
  preventDefault: true,   // blocks page scroll while swiping
  // excludeSelector only needed for non-button interactive areas
});
```

---

## Theming

Five themes: `cyberpunk` (default), `xbox`, `playstation`, `nintendo`, `steam`.

Themes are pure CSS (`[data-theme="x"]` blocks in `src/index.css`). `ThemeService` sets `document.documentElement.dataset.theme`. Use CSS custom properties everywhere:

```css
background: var(--color-surface);
border-radius: var(--radius-btn);
font-family: var(--font);
text-transform: var(--ui-text-transform);
```

Never hardcode colors or radii in game CSS — theme tokens cover everything.

---

## File conventions

- No constructor parameter properties (TS `erasableSyntaxOnly`).
- No comments explaining what code does — only WHY when non-obvious.
- `useRef` for values that need to be current inside intervals/callbacks without stale closures.
- Canvas games: dark background (`#0a0b0d`) regardless of theme; grid lines at `rgba(255,255,255,0.04)`.
