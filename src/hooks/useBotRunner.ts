import { useEffect } from 'react';
import type { IGame } from '../games/_contract/IGame';
import type { IBot, BotDifficulty } from '../games/_contract/IBot';
import type { BotPlayer } from '../types/bot';
import type { Player } from '../core';

const THINKING_DELAY: Record<BotDifficulty, number> = {
  easy: 1800,
  medium: 1000,
  hard: 500,
};

export function useBotRunner<TState, TAction>(
  botPlayers: BotPlayer[],
  gameState: TState | null,
  game: IGame<TState, TAction>,
  bot: IBot<TState, TAction>,
  isHost: boolean,
  applyAction: (action: TAction, from: Player) => void,
): void {
  useEffect(() => {
    if (!isHost || !gameState) return;

    const botPlayer = botPlayers.find(b =>
      game.canAct ? game.canAct(gameState, b.id) : false,
    );
    if (!botPlayer) return;

    const timer = setTimeout(() => {
      const action = bot.chooseAction(gameState, botPlayer.id, botPlayer.difficulty);
      applyAction(action, { id: botPlayer.id, name: botPlayer.name, joinedAt: 0 });
    }, THINKING_DELAY[botPlayer.difficulty]);

    return () => clearTimeout(timer);
  }, [gameState, isHost, botPlayers]); // eslint-disable-line react-hooks/exhaustive-deps
}
