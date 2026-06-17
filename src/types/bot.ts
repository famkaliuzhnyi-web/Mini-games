import type { BotDifficulty } from '../games/_contract/IBot';

export interface BotPlayer {
  id: string;
  name: string;
  difficulty: BotDifficulty;
}
