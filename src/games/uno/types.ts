export type UnoColor = 'red' | 'yellow' | 'green' | 'blue';
export type UnoWildColor = UnoColor | 'wild';

export type UnoCardValue =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'skip' | 'reverse' | 'draw2'
  | 'wild' | 'wild4';

export interface UnoCard {
  id: string;
  color: UnoWildColor;
  value: UnoCardValue;
  resolvedColor?: UnoColor;
}

export interface UnoPlayerState {
  id: string;
  name: string;
  hand: UnoCard[];
  isUno: boolean;
}

export interface UnoGameState {
  status: 'waiting' | 'playing' | 'finished';
  deck: UnoCard[];
  discard: UnoCard[];
  players: UnoPlayerState[];
  playerOrder: string[];
  currentPlayerIndex: number;
  direction: 1 | -1;
  winnerId: string | null;
  gameCount: number;
}

export type UnoAction =
  | { type: 'start' }
  | { type: 'play-card'; cardId: string; chosenColor?: UnoColor }
  | { type: 'draw-card' };
