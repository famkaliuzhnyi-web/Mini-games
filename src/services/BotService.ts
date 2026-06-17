import type { BotDifficulty } from '../games/_contract/IBot';
import type { BotPlayer } from '../types/bot';

const NAME_POOL = [
  'ARIA', 'Blip', 'Bolt', 'Byte', 'Circuit', 'DRIX', 'ECHO', 'Flux',
  'KIBO', 'NX-01', 'NOVA', 'ORION', 'Pixel', 'R3X', 'T1-M3', 'VEGA',
  'VERA', 'Zara-7', 'Atlas', 'Chip',
];

class BotService {
  private bots: BotPlayer[] = [];
  private usedNames: Set<string> = new Set();
  private subscribers: Set<() => void> = new Set();

  private pickName(): string {
    const available = NAME_POOL.filter(n => !this.usedNames.has(n));
    if (available.length === 0) {
      this.usedNames.clear();
      return NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)];
    }
    return available[Math.floor(Math.random() * available.length)];
  }

  private notify(): void {
    this.subscribers.forEach(cb => cb());
  }

  addBot(difficulty: BotDifficulty): BotPlayer {
    const name = this.pickName();
    this.usedNames.add(name);
    const bot: BotPlayer = {
      id: 'bot_' + crypto.randomUUID(),
      name,
      difficulty,
    };
    this.bots = [...this.bots, bot];
    this.notify();
    return bot;
  }

  removeBot(id: string): void {
    const bot = this.bots.find(b => b.id === id);
    if (bot) this.usedNames.delete(bot.name);
    this.bots = this.bots.filter(b => b.id !== id);
    this.notify();
  }

  getBots(): BotPlayer[] {
    return [...this.bots];
  }

  clearBots(): void {
    this.bots = [];
    this.usedNames.clear();
    this.notify();
  }

  isBot(id: string): boolean {
    return id.startsWith('bot_');
  }

  subscribe(cb: () => void): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }
}

export const botService = new BotService();
