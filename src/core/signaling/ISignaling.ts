export type Unsubscribe = () => void;

/**
 * Out-of-band signaling channel used only during WebRTC handshake.
 * After peer connections are established, all communication moves to WebRTC data channels.
 *
 * Topology: star — every guest connects to the host; guests don't connect to each other.
 * Signaling slots are indexed by guest peer ID, host is always the other party.
 */
export interface ISignaling {
  // ── Host operations ──────────────────────────────────────────────────────

  /** Register a new session and mark this peer as its host. */
  publishSession(sessionId: string, hostId: string): Promise<void>;

  /** Called on host: fires whenever a new guest has written their join intent. */
  onNewPeer(sessionId: string, cb: (peerId: string) => void): Unsubscribe;

  /** Host sends its WebRTC offer to a specific guest. */
  sendOffer(sessionId: string, peerId: string, offer: RTCSessionDescriptionInit): Promise<void>;

  /** Host waits for the guest's answer. */
  onAnswer(
    sessionId: string,
    peerId: string,
    cb: (answer: RTCSessionDescriptionInit) => void,
  ): Unsubscribe;

  /** Host trickles its ICE candidates to a specific guest. */
  sendHostIce(sessionId: string, peerId: string, candidate: RTCIceCandidateInit): Promise<void>;

  /** Host receives ICE candidates from a specific guest. */
  onGuestIce(
    sessionId: string,
    peerId: string,
    cb: (candidate: RTCIceCandidateInit) => void,
  ): Unsubscribe;

  // ── Guest operations ─────────────────────────────────────────────────────

  /** Returns the host's player ID for a session, so the guest can label the connection. */
  getHostId(sessionId: string): Promise<string>;

  /** Guest announces its presence to the host. */
  joinSession(sessionId: string, peerId: string): Promise<void>;

  /** Guest waits for the host's offer. */
  onOffer(
    sessionId: string,
    peerId: string,
    cb: (offer: RTCSessionDescriptionInit) => void,
  ): Unsubscribe;

  /** Guest sends its answer back to the host. */
  sendAnswer(sessionId: string, peerId: string, answer: RTCSessionDescriptionInit): Promise<void>;

  /** Guest trickles its ICE candidates to the host. */
  sendGuestIce(sessionId: string, peerId: string, candidate: RTCIceCandidateInit): Promise<void>;

  /** Guest receives ICE candidates from the host. */
  onHostIce(
    sessionId: string,
    peerId: string,
    cb: (candidate: RTCIceCandidateInit) => void,
  ): Unsubscribe;

  // ── Shared ───────────────────────────────────────────────────────────────

  /** Remove signaling data for a peer (call after WebRTC connection is up). */
  cleanupPeer(sessionId: string, peerId: string): Promise<void>;
}
