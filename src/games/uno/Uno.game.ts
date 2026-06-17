import type { IGame } from '../_contract/IGame';
import type { Player } from '../../core';
import type { UnoGameState, UnoAction, UnoCard } from './types';
import {
  createInitialDeck,
  getActiveColor,
  canPlayCard,
  getNextIndex,
  reshuffleIfNeeded,
} from './gameLogic';

function updateUnoFlags(players: UnoGameState['players']): UnoGameState['players'] {
  return players.map(p => ({ ...p, isUno: p.hand.length === 1 }));
}

function drawCards(
  count: number,
  deck: UnoCard[],
  discard: UnoCard[],
): { drawn: UnoCard[]; deck: UnoCard[]; discard: UnoCard[] } {
  let d = deck;
  let disc = discard;
  const drawn: UnoCard[] = [];
  for (let i = 0; i < count; i++) {
    if (d.length === 0) {
      const reshuffled = reshuffleIfNeeded(d, disc);
      d = reshuffled.deck;
      disc = reshuffled.discard;
    }
    if (d.length === 0) break;
    drawn.push(d[d.length - 1]);
    d = d.slice(0, d.length - 1);
  }
  return { drawn, deck: d, discard: disc };
}

class UnoGameLogic implements IGame<UnoGameState, UnoAction> {
  readonly id = 'uno';

  initialState(players: Player[]): UnoGameState {
    return {
      status: 'waiting',
      deck: [],
      discard: [],
      players: players.map(p => ({ id: p.id, name: p.name, hand: [], isUno: false })),
      playerOrder: players.map(p => p.id),
      currentPlayerIndex: 0,
      direction: 1,
      winnerId: null,
      gameCount: 0,
    };
  }

  reduce(state: UnoGameState, action: UnoAction, from: Player): UnoGameState | null {
    if (action.type === 'start') {
      if (state.status !== 'waiting' && state.status !== 'finished') return null;
      if (!state.playerOrder.includes(from.id)) return null;

      let deck = createInitialDeck();
      const hands: UnoCard[][] = state.playerOrder.map(() => []);

      for (let i = 0; i < 7; i++) {
        for (let p = 0; p < state.playerOrder.length; p++) {
          hands[p].push(deck[deck.length - 1]);
          deck = deck.slice(0, deck.length - 1);
        }
      }

      let discard: UnoCard[] = [];
      while (deck.length > 0) {
        const top = deck[deck.length - 1];
        deck = deck.slice(0, deck.length - 1);
        if (top.color !== 'wild') {
          discard = [top];
          break;
        }
        deck = [top, ...deck];
      }

      const newPlayers = state.players.map((p, i) => ({
        ...p,
        hand: hands[i],
        isUno: hands[i].length === 1,
      }));

      return {
        ...state,
        status: 'playing',
        deck,
        discard,
        players: newPlayers,
        currentPlayerIndex: 0,
        direction: 1,
        winnerId: null,
        gameCount: state.gameCount + 1,
      };
    }

    if (action.type === 'play-card') {
      if (state.status !== 'playing') return null;
      if (state.playerOrder[state.currentPlayerIndex] !== from.id) return null;

      const playerIdx = state.players.findIndex(p => p.id === from.id);
      if (playerIdx === -1) return null;

      const player = state.players[playerIdx];
      const cardIdx = player.hand.findIndex(c => c.id === action.cardId);
      if (cardIdx === -1) return null;

      const card = player.hand[cardIdx];

      if (card.color === 'wild' && !action.chosenColor) return null;

      const topCard = state.discard[state.discard.length - 1];
      const activeColor = getActiveColor(topCard);

      if (!canPlayCard(card, topCard, activeColor)) return null;

      const playedCard: UnoCard = card.color === 'wild'
        ? { ...card, resolvedColor: action.chosenColor }
        : card;

      const newHand = player.hand.filter((_, i) => i !== cardIdx);
      let newPlayers = state.players.map((p, i) =>
        i === playerIdx ? { ...p, hand: newHand } : p
      );

      const newDiscard = [...state.discard, playedCard];
      let deck = state.deck;
      let currentIdx = state.currentPlayerIndex;
      const total = state.playerOrder.length;
      let direction = state.direction;

      if (newHand.length === 0) {
        newPlayers = updateUnoFlags(newPlayers);
        return {
          ...state,
          status: 'finished',
          deck,
          discard: newDiscard,
          players: newPlayers,
          currentPlayerIndex: currentIdx,
          direction,
          winnerId: from.id,
        };
      }

      if (card.value === 'skip') {
        currentIdx = getNextIndex(currentIdx, direction, total);
        currentIdx = getNextIndex(currentIdx, direction, total);
      } else if (card.value === 'reverse') {
        direction = direction === 1 ? -1 : 1;
        if (total === 2) {
          currentIdx = getNextIndex(currentIdx, direction, total);
          currentIdx = getNextIndex(currentIdx, direction, total);
        } else {
          currentIdx = getNextIndex(currentIdx, direction, total);
        }
      } else if (card.value === 'draw2') {
        const nextIdx = getNextIndex(currentIdx, direction, total);
        const nextPlayerId = state.playerOrder[nextIdx];
        const nextPlayerIdx = newPlayers.findIndex(p => p.id === nextPlayerId);
        const drawResult = drawCards(2, deck, newDiscard.slice(0, newDiscard.length - 1).concat([playedCard]));
        deck = drawResult.deck;
        const updatedDiscard = drawResult.discard.length < newDiscard.length
          ? [...drawResult.discard.slice(0, drawResult.discard.length - 1), playedCard]
          : newDiscard;
        newPlayers = newPlayers.map((p, i) =>
          i === nextPlayerIdx ? { ...p, hand: [...p.hand, ...drawResult.drawn] } : p
        );
        currentIdx = getNextIndex(nextIdx, direction, total);

        newPlayers = updateUnoFlags(newPlayers);
        return {
          ...state,
          status: 'playing',
          deck,
          discard: updatedDiscard,
          players: newPlayers,
          currentPlayerIndex: currentIdx,
          direction,
          winnerId: null,
        };
      } else if (card.value === 'wild4') {
        const nextIdx = getNextIndex(currentIdx, direction, total);
        const nextPlayerId = state.playerOrder[nextIdx];
        const nextPlayerIdx = newPlayers.findIndex(p => p.id === nextPlayerId);
        const drawResult = drawCards(4, deck, newDiscard);
        deck = drawResult.deck;
        newPlayers = newPlayers.map((p, i) =>
          i === nextPlayerIdx ? { ...p, hand: [...p.hand, ...drawResult.drawn] } : p
        );
        currentIdx = getNextIndex(nextIdx, direction, total);

        newPlayers = updateUnoFlags(newPlayers);
        return {
          ...state,
          status: 'playing',
          deck,
          discard: drawResult.discard,
          players: newPlayers,
          currentPlayerIndex: currentIdx,
          direction,
          winnerId: null,
        };
      } else {
        currentIdx = getNextIndex(currentIdx, direction, total);
      }

      newPlayers = updateUnoFlags(newPlayers);
      return {
        ...state,
        status: 'playing',
        deck,
        discard: newDiscard,
        players: newPlayers,
        currentPlayerIndex: currentIdx,
        direction,
        winnerId: null,
      };
    }

    if (action.type === 'draw-card') {
      if (state.status !== 'playing') return null;
      if (state.playerOrder[state.currentPlayerIndex] !== from.id) return null;

      const playerIdx = state.players.findIndex(p => p.id === from.id);
      if (playerIdx === -1) return null;

      const reshuffled = reshuffleIfNeeded(state.deck, state.discard);
      let deck = reshuffled.deck;
      let discard = reshuffled.discard;

      let newPlayers = state.players;
      if (deck.length > 0) {
        const drawn = deck[deck.length - 1];
        deck = deck.slice(0, deck.length - 1);
        newPlayers = state.players.map((p, i) =>
          i === playerIdx ? { ...p, hand: [...p.hand, drawn] } : p
        );
      }

      const nextIdx = getNextIndex(state.currentPlayerIndex, state.direction, state.playerOrder.length);
      newPlayers = updateUnoFlags(newPlayers);

      return {
        ...state,
        deck,
        discard,
        players: newPlayers,
        currentPlayerIndex: nextIdx,
      };
    }

    return null;
  }

  canAct(state: UnoGameState, playerId: string): boolean {
    if (state.status !== 'playing') return false;
    return state.playerOrder[state.currentPlayerIndex] === playerId;
  }

  validateSnapshot(raw: unknown): UnoGameState {
    const s = raw as UnoGameState;
    if (!s || typeof s !== 'object') throw new Error('Invalid UNO snapshot');
    if (!('status' in s) || !['waiting', 'playing', 'finished'].includes(s.status)) {
      throw new Error('Invalid UNO snapshot: bad status');
    }
    if (!Array.isArray(s.players)) throw new Error('Invalid UNO snapshot: players');
    if (!Array.isArray(s.playerOrder)) throw new Error('Invalid UNO snapshot: playerOrder');
    if (typeof s.currentPlayerIndex !== 'number') throw new Error('Invalid UNO snapshot: currentPlayerIndex');
    if (s.direction !== 1 && s.direction !== -1) throw new Error('Invalid UNO snapshot: direction');
    if (!Array.isArray(s.deck)) throw new Error('Invalid UNO snapshot: deck');
    if (!Array.isArray(s.discard)) throw new Error('Invalid UNO snapshot: discard');
    return s;
  }
}

export const unoGame = new UnoGameLogic();
