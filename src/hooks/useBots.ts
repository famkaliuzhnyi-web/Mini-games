import { useState, useEffect } from 'react';
import { botService } from '../services/BotService';
import type { BotDifficulty } from '../games/_contract/IBot';
import type { BotPlayer } from '../types/bot';

export function useBots(): {
  bots: BotPlayer[];
  addBot: (difficulty: BotDifficulty) => BotPlayer;
  removeBot: (id: string) => void;
  clearBots: () => void;
} {
  const [bots, setBots] = useState<BotPlayer[]>(() => botService.getBots());

  useEffect(() => {
    return botService.subscribe(() => setBots(botService.getBots()));
  }, []);

  return {
    bots,
    addBot: (difficulty: BotDifficulty) => botService.addBot(difficulty),
    removeBot: (id: string) => botService.removeBot(id),
    clearBots: () => botService.clearBots(),
  };
}
