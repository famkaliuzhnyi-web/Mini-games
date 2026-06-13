import type { ISignaling, Unsubscribe } from './ISignaling';

/**
 * BroadcastChannel-based signaling for same-origin cross-tab development.
 * Works out of the box with no external service — open two tabs of the app
 * and they can reach each other through this channel.
 *
 * Replace with FirebaseSignaling for real cross-device play.
 */
export class MockSignaling implements ISignaling {
  private channel = new BroadcastChannel('mini-games-signaling');
  private subs = new Map<string, Set<(payload: unknown) => void>>();

  constructor() {
    this.channel.onmessage = ({ data }) => {
      const { topic, payload } = data as { topic: string; payload: unknown };
      this.subs.get(topic)?.forEach(cb => cb(payload));
    };
  }

  private pub(topic: string, payload: unknown): void {
    this.channel.postMessage({ topic, payload });
  }

  private sub(topic: string, cb: (payload: unknown) => void): Unsubscribe {
    if (!this.subs.has(topic)) this.subs.set(topic, new Set());
    this.subs.get(topic)!.add(cb);
    return () => this.subs.get(topic)?.delete(cb);
  }

  // ── Host ─────────────────────────────────────────────────────────────────

  async publishSession(sessionId: string, hostId: string): Promise<void> {
    localStorage.setItem(`mock:session:${sessionId}`, hostId);
  }

  onNewPeer(sessionId: string, cb: (peerId: string) => void): Unsubscribe {
    return this.sub(`${sessionId}:peer:join`, cb as (p: unknown) => void);
  }

  async sendOffer(sessionId: string, peerId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    this.pub(`${sessionId}:${peerId}:offer`, offer);
  }

  onAnswer(sessionId: string, peerId: string, cb: (answer: RTCSessionDescriptionInit) => void): Unsubscribe {
    return this.sub(`${sessionId}:${peerId}:answer`, cb as (p: unknown) => void);
  }

  async sendHostIce(sessionId: string, peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    this.pub(`${sessionId}:${peerId}:host-ice`, candidate);
  }

  onGuestIce(sessionId: string, peerId: string, cb: (candidate: RTCIceCandidateInit) => void): Unsubscribe {
    return this.sub(`${sessionId}:${peerId}:guest-ice`, cb as (p: unknown) => void);
  }

  // ── Guest ────────────────────────────────────────────────────────────────

  async getHostId(sessionId: string): Promise<string> {
    return localStorage.getItem(`mock:session:${sessionId}`) ?? '';
  }

  async joinSession(sessionId: string, peerId: string): Promise<void> {
    this.pub(`${sessionId}:peer:join`, peerId);
  }

  onOffer(sessionId: string, peerId: string, cb: (offer: RTCSessionDescriptionInit) => void): Unsubscribe {
    return this.sub(`${sessionId}:${peerId}:offer`, cb as (p: unknown) => void);
  }

  async sendAnswer(sessionId: string, peerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    this.pub(`${sessionId}:${peerId}:answer`, answer);
  }

  async sendGuestIce(sessionId: string, peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    this.pub(`${sessionId}:${peerId}:guest-ice`, candidate);
  }

  onHostIce(sessionId: string, peerId: string, cb: (candidate: RTCIceCandidateInit) => void): Unsubscribe {
    return this.sub(`${sessionId}:${peerId}:host-ice`, cb as (p: unknown) => void);
  }

  // ── Shared ───────────────────────────────────────────────────────────────

  async cleanupPeer(sessionId: string, peerId: string): Promise<void> {
    [`offer`, `answer`, `host-ice`, `guest-ice`].forEach(suffix =>
      this.subs.delete(`${sessionId}:${peerId}:${suffix}`),
    );
  }
}
