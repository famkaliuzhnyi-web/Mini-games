import type { IBot, BotDifficulty } from '../_contract/IBot';
import type { UnoGameState, UnoAction, UnoColor, UnoCard } from './types';
import { getActiveColor, getPlayableCards } from './gameLogic';

function isWild(card: UnoCard): boolean {
  return card.color === 'wild';
}

function isActionCard(card: UnoCard): boolean {
  return ['skip', 'reverse', 'draw2', 'wild4'].includes(card.value);
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomColor(): UnoColor {
  return randomFrom(['red', 'yellow', 'green', 'blue']);
}

function mostCommonColor(hand: UnoCard[]): UnoColor {
  const counts: Record<UnoColor, number> = { red: 0, yellow: 0, green: 0, blue: 0 };
  for (const card of hand) {
    if (card.color !== 'wild') counts[card.color as UnoColor]++;
  }
  const best = (Object.entries(counts) as [UnoColor, number][]).reduce(
    (a, b) => b[1] > a[1] ? b : a,
    ['red', 0] as [UnoColor, number],
  );
  if (best[1] === 0) return randomColor();
  return best[0];
}

function chooseWildColor(hand: UnoCard[]): UnoColor {
  return mostCommonColor(hand);
}

class UnoBotLogic implements IBot<UnoGameState, UnoAction> {
  chooseAction(state: UnoGameState, playerId: string, difficulty: BotDifficulty): UnoAction {
    const playerState = state.players.find(p => p.id === playerId);
    if (!playerState) return { type: 'draw-card' };

    const topCard = state.discard[state.discard.length - 1];
    const activeColor = getActiveColor(topCard);
    const playable = getPlayableCards(playerState.hand, topCard, activeColor);

    if (playable.length === 0) return { type: 'draw-card' };

    if (difficulty === 'easy') {
      const card = randomFrom(playable);
      return {
        type: 'play-card',
        cardId: card.id,
        ...(isWild(card) ? { chosenColor: randomColor() } : {}),
      };
    }

    if (difficulty === 'medium') {
      const nonWilds = playable.filter(c => !isWild(c));
      const wilds = playable.filter(c => isWild(c));

      let chosen: UnoCard;
      if (nonWilds.length > 0) {
        const actions = nonWilds.filter(c => isActionCard(c));
        const colorMatch = nonWilds.filter(c => c.color === activeColor);
        if (actions.length > 0) {
          chosen = randomFrom(actions);
        } else if (colorMatch.length > 0) {
          chosen = randomFrom(colorMatch);
        } else {
          chosen = randomFrom(nonWilds);
        }
      } else {
        chosen = randomFrom(wilds);
      }

      return {
        type: 'play-card',
        cardId: chosen.id,
        ...(isWild(chosen) ? { chosenColor: chooseWildColor(playerState.hand) } : {}),
      };
    }

    // hard
    const hand = playerState.hand;
    const nonWilds = playable.filter(c => !isWild(c));
    const wildCards = playable.filter(c => c.value === 'wild');
    const wild4Cards = playable.filter(c => c.value === 'wild4');
    const draw2Cards = nonWilds.filter(c => c.value === 'draw2');
    const skipCards = nonWilds.filter(c => c.value === 'skip');
    const reverseCards = nonWilds.filter(c => c.value === 'reverse');
    const numberCards = nonWilds.filter(c => !isActionCard(c));

    const otherOptionsCount = draw2Cards.length + skipCards.length + reverseCards.length + numberCards.length + wildCards.length;
    const emergencyThreshold = otherOptionsCount < 3;

    let chosen: UnoCard | null = null;

    if (wild4Cards.length > 0 && (hand.length <= 4 || emergencyThreshold)) {
      chosen = wild4Cards[0];
    } else if (draw2Cards.length > 0) {
      chosen = randomFrom(draw2Cards);
    } else if (skipCards.length > 0) {
      chosen = randomFrom(skipCards);
    } else if (reverseCards.length > 0) {
      chosen = randomFrom(reverseCards);
    } else if (numberCards.length > 0) {
      const byColor = numberCards.reduce<Record<string, UnoCard[]>>((acc, c) => {
        const col = c.color as string;
        if (!acc[col]) acc[col] = [];
        acc[col].push(c);
        return acc;
      }, {});
      const dominant = mostCommonColor(hand);
      if (byColor[dominant]?.length > 0) {
        chosen = randomFrom(byColor[dominant]);
      } else {
        chosen = randomFrom(numberCards);
      }
    } else if (wild4Cards.length > 0) {
      chosen = wild4Cards[0];
    } else if (wildCards.length > 0) {
      chosen = randomFrom(wildCards);
    }

    if (!chosen) chosen = randomFrom(playable);

    return {
      type: 'play-card',
      cardId: chosen.id,
      ...(isWild(chosen) ? { chosenColor: chooseWildColor(hand) } : {}),
    };
  }
}

export const unoBot = new UnoBotLogic();
