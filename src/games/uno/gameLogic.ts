import type { UnoCard, UnoColor, UnoCardValue } from './types';

export function createDeck(): UnoCard[] {
  const colors: UnoColor[] = ['red', 'yellow', 'green', 'blue'];
  const cards: UnoCard[] = [];
  let idx = 0;

  for (const color of colors) {
    cards.push({ id: `c${idx++}`, color, value: '0' });
    const doubles: UnoCardValue[] = ['1','2','3','4','5','6','7','8','9','skip','reverse','draw2'];
    for (const value of doubles) {
      cards.push({ id: `c${idx++}`, color, value });
      cards.push({ id: `c${idx++}`, color, value });
    }
  }

  for (let i = 0; i < 4; i++) {
    cards.push({ id: `c${idx++}`, color: 'wild', value: 'wild' });
    cards.push({ id: `c${idx++}`, color: 'wild', value: 'wild4' });
  }

  return cards;
}

export function shuffleDeck(deck: UnoCard[]): UnoCard[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createInitialDeck(): UnoCard[] {
  return shuffleDeck(createDeck());
}

export function getActiveColor(topCard: UnoCard): UnoColor {
  if (topCard.color !== 'wild') return topCard.color as UnoColor;
  return topCard.resolvedColor!;
}

export function canPlayCard(card: UnoCard, topCard: UnoCard, activeColor: UnoColor): boolean {
  if (card.color === 'wild') return true;
  if (card.color === activeColor) return true;
  if (card.value === topCard.value) return true;
  return false;
}

export function getPlayableCards(hand: UnoCard[], topCard: UnoCard, activeColor: UnoColor): UnoCard[] {
  return hand.filter(card => canPlayCard(card, topCard, activeColor));
}

export function getNextIndex(current: number, direction: 1 | -1, total: number): number {
  return ((current + direction) % total + total) % total;
}

export function reshuffleIfNeeded(
  deck: UnoCard[],
  discard: UnoCard[],
): { deck: UnoCard[]; discard: UnoCard[] } {
  if (deck.length > 0) return { deck, discard };
  if (discard.length <= 1) return { deck, discard };

  const topCard = discard[discard.length - 1];
  const toShuffle = discard.slice(0, discard.length - 1).map(c => {
    if (c.color === 'wild') return { ...c, resolvedColor: undefined };
    return c;
  });
  return {
    deck: shuffleDeck(toShuffle),
    discard: [topCard],
  };
}
