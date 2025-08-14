/**
 * Custom hook for coin management
 */
import { useState, useEffect, useCallback } from 'react';
import { CoinService } from '../services/CoinService';
import type { CoinTransaction, CoinEarnReason, CoinSpendReason } from '../types/coin';

export function useCoinService() {
  const [balance, setBalance] = useState<number>(0);
  const [coinService] = useState(() => CoinService.getInstance());

  // Update balance when component mounts and when transactions happen
  const updateBalance = useCallback(() => {
    setBalance(coinService.getBalance());
  }, [coinService]);

  useEffect(() => {
    updateBalance();

    // Listen for coin transactions
    const handleTransaction = (data: { balance: number; transaction: CoinTransaction }) => {
      setBalance(data.balance);
    };

    coinService.on('*', handleTransaction);

    return () => {
      coinService.off('*', handleTransaction);
    };
  }, [coinService, updateBalance]);

  const earnCoins = useCallback((
    amount: number, 
    reason: CoinEarnReason, 
    gameId?: string, 
    description?: string
  ): CoinTransaction => {
    return coinService.earnCoins(amount, reason, gameId, description);
  }, [coinService]);

  const spendCoins = useCallback((
    amount: number, 
    reason: CoinSpendReason, 
    description: string
  ): CoinTransaction | null => {
    return coinService.spendCoins(amount, reason, description);
  }, [coinService]);

  const canSpend = useCallback((amount: number): boolean => {
    return coinService.canSpend(amount);
  }, [coinService]);

  const getTransactionHistory = useCallback((limit?: number): CoinTransaction[] => {
    return coinService.getTransactionHistory(limit);
  }, [coinService]);

  const awardGameCompletion = useCallback((
    gameId: string, 
    baseReward: number, 
    score?: number
  ): CoinTransaction => {
    return coinService.awardGameCompletion(gameId, baseReward, score);
  }, [coinService]);

  const awardGamePlay = useCallback((
    gameId: string, 
    baseReward?: number
  ): CoinTransaction => {
    return coinService.awardGamePlay(gameId, baseReward);
  }, [coinService]);

  const purchaseTheme = useCallback((
    themeName: string,
    cost: number
  ): { success: boolean; transaction?: CoinTransaction; error?: string } => {
    return coinService.purchaseTheme(themeName, cost);
  }, [coinService]);

  return {
    balance,
    earnCoins,
    spendCoins,
    canSpend,
    getTransactionHistory,
    awardGameCompletion,
    awardGamePlay,
    purchaseTheme,
    refresh: updateBalance
  };
}