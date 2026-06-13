export type { Player, PlayerId, Message, SessionSnapshot } from './messaging/types';
export type { ISignaling, Unsubscribe } from './signaling/ISignaling';
export { SessionManager } from './session/SessionManager';
export { MockSignaling } from './signaling/MockSignaling';
export { FirebaseSignaling } from './signaling/FirebaseSignaling';

import { db, isFirebaseReady } from '../firebase';
import { FirebaseSignaling } from './signaling/FirebaseSignaling';
import { MockSignaling } from './signaling/MockSignaling';
import { SessionManager } from './session/SessionManager';
import type { ISignaling } from './signaling/ISignaling';

/**
 * Returns the best available signaling implementation:
 * - FirebaseSignaling when Firebase env vars are configured (cross-device play)
 * - MockSignaling via BroadcastChannel otherwise (same-device, cross-tab only)
 */
export function createSignaling(): ISignaling {
  if (isFirebaseReady && db) {
    return new FirebaseSignaling(db);
  }
  console.warn(
    '[mini-games] Firebase not configured — using BroadcastChannel signaling.\n' +
    'Copy .env.example → .env.local and fill in your Firebase credentials for cross-device play.',
  );
  return new MockSignaling();
}

/** Singleton session manager for the app — created once, shared via React context. */
export function createSessionManager(): SessionManager {
  return new SessionManager(createSignaling());
}
