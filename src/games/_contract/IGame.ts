import type { Player } from '../../core';

/**
 * Contract every multiplayer-capable game must implement.
 *
 * The implementation is a pure data layer — no React, no side-effects.
 * React components wrap it and connect it to the SessionManager.
 *
 * Turn enforcement is optional: implement canAct() for turn-based games
 * (tic-tac-toe, chess) and skip it for free-for-all games (drawing, ping-pong).
 */
export interface IGame<TState, TAction> {
  readonly id: string;

  /**
   * Return a fresh initial state for the given set of players.
   * Called when the host starts a new round.
   */
  initialState(players: Player[]): TState;

  /**
   * Validate and apply an action to the current state.
   * Returns the new state, or null if the action is illegal.
   * Must be a pure function — do not mutate state.
   */
  reduce(state: TState, action: TAction, from: Player): TState | null;

  /**
   * Can this player act right now?
   * Returning false blocks the UI from sending an action.
   * Defaults to true if not implemented.
   */
  canAct?(state: TState, playerId: string): boolean;

  /**
   * Validate and normalise a snapshot received from the host (late join).
   * Throw if the snapshot is structurally invalid.
   */
  validateSnapshot(snapshot: unknown): TState;
}
