/**
 * Coin Service - Handles coin transactions and balance management
 */
import type { 
  CoinBalance, 
  CoinTransaction, 
  CoinEarnReason, 
  CoinSpendReason,
  CoinServiceInterface
} from '../types/coin';
import { UserService } from './UserService';

export class CoinService implements CoinServiceInterface {
  private static instance: CoinService | null = null;
  private userService: UserService;
  private eventListeners: { [event: string]: ((data: { balance: number; transaction: CoinTransaction }) => void)[] } = {};

  private constructor() {
    this.userService = UserService.getInstance();
  }

  public static getInstance(): CoinService {
    if (!CoinService.instance) {
      CoinService.instance = new CoinService();
    }
    return CoinService.instance;
  }

  /**
   * Get current coin balance
   */
  public getBalance(): number {
    const profile = this.userService.loadProfile();
    return profile?.coins.total || 0;
  }

  /**
   * Earn coins and add transaction record
   */
  public earnCoins(
    amount: number, 
    reason: CoinEarnReason, 
    gameId?: string, 
    description?: string
  ): CoinTransaction {
    if (amount < 0) {
      throw new Error('Earn amount must be positive');
    }

    const profile = this.userService.loadProfile();
    if (!profile) {
      throw new Error('User profile not found');
    }

    const transaction: CoinTransaction = {
      id: this.generateTransactionId(),
      type: 'earn',
      amount,
      reason,
      gameId,
      description: description || `Earned ${amount} coins from ${reason}`,
      timestamp: new Date().toISOString()
    };

    const updatedCoins: CoinBalance = {
      total: profile.coins.total + amount,
      lastUpdated: transaction.timestamp,
      transactions: [transaction, ...profile.coins.transactions].slice(0, 100) // Keep last 100 transactions
    };

    // Update user profile
    this.userService.saveProfile({
      ...profile,
      coins: updatedCoins
    });

    console.log(`Coins earned: +${amount} (${reason}). New balance: ${updatedCoins.total}`);
    
    // Emit event
    this.emitEvent('earn', { balance: updatedCoins.total, transaction });

    return transaction;
  }

  /**
   * Spend coins if balance is sufficient
   */
  public spendCoins(amount: number, reason: CoinSpendReason, description: string): CoinTransaction | null {
    if (amount < 0) {
      throw new Error('Spend amount must be positive');
    }

    const profile = this.userService.loadProfile();
    if (!profile) {
      throw new Error('User profile not found');
    }

    if (profile.coins.total < amount) {
      console.warn(`Insufficient coins to spend ${amount}. Current balance: ${profile.coins.total}`);
      return null;
    }

    const transaction: CoinTransaction = {
      id: this.generateTransactionId(),
      type: 'spend',
      amount,
      reason,
      description,
      timestamp: new Date().toISOString()
    };

    const updatedCoins: CoinBalance = {
      total: profile.coins.total - amount,
      lastUpdated: transaction.timestamp,
      transactions: [transaction, ...profile.coins.transactions].slice(0, 100) // Keep last 100 transactions
    };

    // Update user profile
    this.userService.saveProfile({
      ...profile,
      coins: updatedCoins
    });

    console.log(`Coins spent: -${amount} (${reason}). New balance: ${updatedCoins.total}`);
    
    // Emit event
    this.emitEvent('spend', { balance: updatedCoins.total, transaction });

    return transaction;
  }

  /**
   * Check if user can spend a certain amount
   */
  public canSpend(amount: number): boolean {
    return this.getBalance() >= amount;
  }

  /**
   * Get transaction history
   */
  public getTransactionHistory(limit?: number): CoinTransaction[] {
    const profile = this.userService.loadProfile();
    if (!profile) {
      return [];
    }

    return limit ? profile.coins.transactions.slice(0, limit) : profile.coins.transactions;
  }

  /**
   * Clear transaction history (keep balance)
   */
  public clearHistory(): void {
    const profile = this.userService.loadProfile();
    if (!profile) {
      return;
    }

    const updatedCoins: CoinBalance = {
      ...profile.coins,
      transactions: [],
      lastUpdated: new Date().toISOString()
    };

    this.userService.saveProfile({
      ...profile,
      coins: updatedCoins
    });

    console.log('Coin transaction history cleared');
  }

  /**
   * Award coins for game completion (convenience method)
   */
  public awardGameCompletion(gameId: string, baseReward: number, score?: number): CoinTransaction {
    let totalReward = baseReward;
    let description = `Completed ${gameId}`;

    if (score && score > 0) {
      const scoreBonus = Math.floor(score / 1000); // 1 coin per 1000 points
      totalReward += scoreBonus;
      description += ` with score ${(score ?? 0).toLocaleString()}`;
    }

    return this.earnCoins(totalReward, 'game_completion', gameId, description);
  }

  /**
   * Award coins for playing a game (convenience method)
   */
  public awardGamePlay(gameId: string, baseReward: number = 1): CoinTransaction {
    return this.earnCoins(baseReward, 'game_play', gameId, `Played ${gameId}`);
  }

  /**
   * Event listener management
   */
  public on(event: string, callback: (data: { balance: number; transaction: CoinTransaction }) => void): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  public off(event: string, callback: (data: { balance: number; transaction: CoinTransaction }) => void): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }
  }

  private emitEvent(event: string, data: { balance: number; transaction: CoinTransaction }): void {
    const listeners = this.eventListeners[event] || [];
    const allListeners = this.eventListeners['*'] || [];
    
    [...listeners, ...allListeners].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} event listener:`, error);
      }
    });
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}