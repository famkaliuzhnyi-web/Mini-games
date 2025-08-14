/**
 * Coin system type definitions for the Mini-games platform
 */

// Coin transaction types
export type CoinTransactionType = 'earn' | 'spend';
export type CoinEarnReason = 'game_completion' | 'game_play' | 'daily_bonus' | 'achievement' | 'manual';
export type CoinSpendReason = 'purchase' | 'unlock' | 'upgrade' | 'manual' | 'undo' | 'theme';

// Coin transaction record
export interface CoinTransaction {
  id: string;
  type: CoinTransactionType;
  amount: number;
  reason: CoinEarnReason | CoinSpendReason;
  gameId?: string;
  description: string;
  timestamp: string;
}

// Coin balance and history
export interface CoinBalance {
  total: number;
  lastUpdated: string;
  transactions: CoinTransaction[];
}

// Coin reward configuration for games
export interface CoinReward {
  gameId: string;
  baseReward: number;
  completionBonus: number;
  scoreMultiplier: number;
}

// Service interfaces
export interface CoinServiceInterface {
  getBalance(): number;
  earnCoins(amount: number, reason: CoinEarnReason, gameId?: string, description?: string): CoinTransaction;
  spendCoins(amount: number, reason: CoinSpendReason, description: string): CoinTransaction | null;
  canSpend(amount: number): boolean;
  getTransactionHistory(limit?: number): CoinTransaction[];
  clearHistory(): void;
}