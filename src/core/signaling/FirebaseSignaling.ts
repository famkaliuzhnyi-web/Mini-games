import {
  type Database,
  ref,
  set,
  get,
  push,
  onChildAdded,
  onValue,
  remove,
} from 'firebase/database';
import type { ISignaling, Unsubscribe } from './ISignaling';

/**
 * Firebase Realtime Database signaling.
 * Used only during WebRTC handshake — once data channels are open, Firebase is idle.
 *
 * Structure:
 *   sessions/{sessionId}/
 *     meta/hostId: string
 *     peers/{peerId}: true          ← guest writes here to announce join intent
 *     signals/{peerId}/
 *       offer: RTCSessionDescriptionInit
 *       answer: RTCSessionDescriptionInit
 *       hostIce/{pushKey}: RTCIceCandidateInit
 *       guestIce/{pushKey}: RTCIceCandidateInit
 */
export class FirebaseSignaling implements ISignaling {
  private db: Database;
  constructor(db: Database) { this.db = db; }

  private r(...segments: string[]) {
    return ref(this.db, segments.join('/'));
  }

  // ── Host ─────────────────────────────────────────────────────────────────

  async publishSession(sessionId: string, hostId: string): Promise<void> {
    await set(this.r('sessions', sessionId, 'meta'), { hostId, createdAt: Date.now() });
  }

  onNewPeer(sessionId: string, cb: (peerId: string) => void): Unsubscribe {
    const peersRef = this.r('sessions', sessionId, 'peers');
    const unsub = onChildAdded(peersRef, snapshot => {
      if (snapshot.key) cb(snapshot.key);
    });
    return unsub;
  }

  async sendOffer(sessionId: string, peerId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    await set(this.r('sessions', sessionId, 'signals', peerId, 'offer'), offer);
  }

  onAnswer(sessionId: string, peerId: string, cb: (answer: RTCSessionDescriptionInit) => void): Unsubscribe {
    const answerRef = this.r('sessions', sessionId, 'signals', peerId, 'answer');
    return onValue(answerRef, snapshot => {
      if (snapshot.exists()) cb(snapshot.val() as RTCSessionDescriptionInit);
    });
  }

  async sendHostIce(sessionId: string, peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    await push(this.r('sessions', sessionId, 'signals', peerId, 'hostIce'), candidate);
  }

  onGuestIce(sessionId: string, peerId: string, cb: (candidate: RTCIceCandidateInit) => void): Unsubscribe {
    return onChildAdded(
      this.r('sessions', sessionId, 'signals', peerId, 'guestIce'),
      snapshot => { if (snapshot.val()) cb(snapshot.val() as RTCIceCandidateInit); },
    );
  }

  // ── Guest ────────────────────────────────────────────────────────────────

  async getHostId(sessionId: string): Promise<string> {
    const snap = await get(this.r('sessions', sessionId, 'meta', 'hostId'));
    return snap.val() as string ?? '';
  }

  async joinSession(sessionId: string, peerId: string): Promise<void> {
    await set(this.r('sessions', sessionId, 'peers', peerId), true);
  }

  onOffer(sessionId: string, peerId: string, cb: (offer: RTCSessionDescriptionInit) => void): Unsubscribe {
    const offerRef = this.r('sessions', sessionId, 'signals', peerId, 'offer');
    return onValue(offerRef, snapshot => {
      if (snapshot.exists()) cb(snapshot.val() as RTCSessionDescriptionInit);
    });
  }

  async sendAnswer(sessionId: string, peerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    await set(this.r('sessions', sessionId, 'signals', peerId, 'answer'), answer);
  }

  async sendGuestIce(sessionId: string, peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    await push(this.r('sessions', sessionId, 'signals', peerId, 'guestIce'), candidate);
  }

  onHostIce(sessionId: string, peerId: string, cb: (candidate: RTCIceCandidateInit) => void): Unsubscribe {
    return onChildAdded(
      this.r('sessions', sessionId, 'signals', peerId, 'hostIce'),
      snapshot => { if (snapshot.val()) cb(snapshot.val() as RTCIceCandidateInit); },
    );
  }

  // ── Shared ───────────────────────────────────────────────────────────────

  async cleanupPeer(sessionId: string, peerId: string): Promise<void> {
    await remove(this.r('sessions', sessionId, 'signals', peerId));
    await remove(this.r('sessions', sessionId, 'peers', peerId));
  }
}
