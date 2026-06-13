import type { ISignaling } from '../signaling/ISignaling';
import type { Message } from '../messaging/types';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

type ConnectionState = 'connecting' | 'connected' | 'closed';

/**
 * One WebRTC connection between the local peer and exactly one remote peer.
 * Uses a single ordered, reliable DataChannel named "game".
 *
 * Hosts call initiate(); guests call respond() after receiving an offer.
 * ICE candidates are trickled via the signaling layer and queued internally
 * until the remote description is set.
 */
export class PeerConnection {
  /** The remote peer's ID — used to scope signaling paths. */
  readonly peerId: string;
  private signaling: ISignaling;
  private sessionId: string;
  /** This peer's own ID. */
  private localId: string;

  private pc: RTCPeerConnection;
  private dataChannel: RTCDataChannel | null = null;
  private pendingIce: RTCIceCandidateInit[] = [];
  private remoteDescSet = false;
  private iceUnsubscribers: (() => void)[] = [];

  state: ConnectionState = 'connecting';

  onMessage: ((msg: Message) => void) | null = null;
  onStateChange: ((state: 'connected' | 'closed') => void) | null = null;

  constructor(peerId: string, signaling: ISignaling, sessionId: string, localId: string) {
    this.peerId = peerId;
    this.signaling = signaling;
    this.sessionId = sessionId;
    this.localId = localId;
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.pc.onconnectionstatechange = () => this.handleConnectionStateChange();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Host calls this: creates offer, sends it, waits for answer. */
  async initiate(): Promise<void> {
    const channel = this.pc.createDataChannel('game', { ordered: true });
    this.attachDataChannel(channel);

    // Listen for ICE from guest before we even send the offer
    const unsub = this.signaling.onGuestIce(this.sessionId, this.peerId, c => this.addIce(c));
    this.iceUnsubscribers.push(unsub);

    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.signaling.sendHostIce(this.sessionId, this.peerId, candidate.toJSON());
      }
    };

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // Watch for guest's answer
    const unsubAnswer = this.signaling.onAnswer(this.sessionId, this.peerId, async answer => {
      unsubAnswer();
      await this.setRemoteDescription(answer);
    });

    await this.signaling.sendOffer(this.sessionId, this.peerId, offer);
  }

  /** Guest calls this: receives host's offer, creates answer. */
  async respond(offer: RTCSessionDescriptionInit): Promise<void> {
    // Host will push data channel to us
    this.pc.ondatachannel = ({ channel }) => this.attachDataChannel(channel);

    // Start listening for host ICE immediately — they may arrive before we're ready
    const unsub = this.signaling.onHostIce(this.sessionId, this.localId, c => this.addIce(c));
    this.iceUnsubscribers.push(unsub);

    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.signaling.sendGuestIce(this.sessionId, this.localId, candidate.toJSON());
      }
    };

    await this.setRemoteDescription(offer);

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    await this.signaling.sendAnswer(this.sessionId, this.localId, answer);
  }

  send(message: Message): void {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(message));
    }
  }

  close(): void {
    this.iceUnsubscribers.forEach(u => u());
    this.dataChannel?.close();
    this.pc.close();
    this.state = 'closed';
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private attachDataChannel(channel: RTCDataChannel): void {
    this.dataChannel = channel;
    channel.onmessage = ({ data }) => {
      try {
        this.onMessage?.(JSON.parse(data as string) as Message);
      } catch {
        // drop malformed frames
      }
    };
  }

  private async setRemoteDescription(desc: RTCSessionDescriptionInit): Promise<void> {
    await this.pc.setRemoteDescription(new RTCSessionDescription(desc));
    this.remoteDescSet = true;
    // Drain any candidates that arrived before the description
    for (const c of this.pendingIce) {
      await this.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
    }
    this.pendingIce = [];
  }

  private addIce(candidate: RTCIceCandidateInit): void {
    if (this.remoteDescSet) {
      this.pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    } else {
      this.pendingIce.push(candidate);
    }
  }

  private handleConnectionStateChange(): void {
    const s = this.pc.connectionState;
    if (s === 'connected') {
      this.state = 'connected';
      // No longer need signaling — clean up Firebase paths
      this.signaling.cleanupPeer(this.sessionId, this.peerId).catch(() => {});
      this.onStateChange?.('connected');
    } else if (s === 'failed' || s === 'closed' || s === 'disconnected') {
      this.state = 'closed';
      this.onStateChange?.('closed');
    }
  }
}
