/**
 * User Service - Handles user profile data persistence
 */
import type { CoinBalance } from '../types/coin';

export interface UserProfile {
  playerName: string;
  playerId: string;
  coins: CoinBalance;
  createdAt: string;
  updatedAt: string;
}

export class UserService {
  private static instance: UserService | null = null;
  private static readonly STORAGE_KEY = 'minigames_user_profile';

  private constructor() {}

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * Save user profile to localStorage
   */
  public saveProfile(profile: Omit<UserProfile, 'createdAt' | 'updatedAt' | 'coins'> & { coins?: CoinBalance }): UserProfile {
    const now = new Date().toISOString();
    const existingProfile = this.loadProfile();
    
    const fullProfile: UserProfile = {
      ...profile,
      // Initialize coins if not provided (for new users)
      coins: profile.coins || existingProfile?.coins || this.createDefaultCoinBalance(),
      createdAt: existingProfile?.createdAt || now,
      updatedAt: now
    };

    localStorage.setItem(UserService.STORAGE_KEY, JSON.stringify(fullProfile));
    console.log(`User profile saved: ${profile.playerName}`);
    return fullProfile;
  }

  /**
   * Load user profile from localStorage
   */
  public loadProfile(): UserProfile | null {
    try {
      const stored = localStorage.getItem(UserService.STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const profile: UserProfile = JSON.parse(stored);
      
      // Migrate existing users to have coins if they don't have them
      if (!profile.coins) {
        profile.coins = this.createDefaultCoinBalance();
        // Save the updated profile with coins
        localStorage.setItem(UserService.STORAGE_KEY, JSON.stringify({
          ...profile,
          updatedAt: new Date().toISOString()
        }));
        console.log('Migrated user profile to include coins system');
      }
      
      // Validate profile structure
      if (!this.validateProfile(profile)) {
        console.warn('Invalid user profile data, removing...');
        this.clearProfile();
        return null;
      }

      return profile;
    } catch (error) {
      console.error('Failed to load user profile:', error);
      this.clearProfile();
      return null;
    }
  }

  /**
   * Update player name
   */
  public updatePlayerName(newName: string): UserProfile | null {
    const existingProfile = this.loadProfile();
    if (!existingProfile) {
      return null;
    }

    return this.saveProfile({
      ...existingProfile,
      playerName: newName.trim()
    });
  }

  /**
   * Clear user profile
   */
  public clearProfile(): void {
    localStorage.removeItem(UserService.STORAGE_KEY);
    console.log('User profile cleared');
  }

  /**
   * Check if user profile exists
   */
  public hasProfile(): boolean {
    return this.loadProfile() !== null;
  }

  /**
   * Generate a new player ID
   */
  public generatePlayerId(): string {
    return `player_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create default coin balance for new users
   */
  private createDefaultCoinBalance(): CoinBalance {
    return {
      total: 100, // Start with 100 coins
      lastUpdated: new Date().toISOString(),
      transactions: [{
        id: `txn_${Math.random().toString(36).substr(2, 9)}`,
        type: 'earn',
        amount: 100,
        reason: 'manual',
        description: 'Welcome bonus',
        timestamp: new Date().toISOString()
      }]
    };
  }

  /**
   * Validate profile structure
   */
  private validateProfile(profile: unknown): profile is UserProfile {
    return !!(
      profile &&
      typeof profile === 'object' &&
      'playerName' in profile &&
      'playerId' in profile &&
      'coins' in profile &&
      'createdAt' in profile &&
      'updatedAt' in profile &&
      typeof (profile as UserProfile).playerName === 'string' &&
      typeof (profile as UserProfile).playerId === 'string' &&
      typeof (profile as UserProfile).createdAt === 'string' &&
      typeof (profile as UserProfile).updatedAt === 'string' &&
      (profile as UserProfile).playerName.trim().length > 0 &&
      (profile as UserProfile).coins &&
      typeof (profile as UserProfile).coins.total === 'number'
    );
  }
}