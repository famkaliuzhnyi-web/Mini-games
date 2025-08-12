/**
 * User Service - Handles user profile data persistence
 */
export interface UserProfile {
  playerName: string;
  playerId: string;
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
  public saveProfile(profile: Omit<UserProfile, 'createdAt' | 'updatedAt'>): UserProfile {
    const now = new Date().toISOString();
    const existingProfile = this.loadProfile();
    
    const fullProfile: UserProfile = {
      ...profile,
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
   * Validate profile structure
   */
  private validateProfile(profile: unknown): profile is UserProfile {
    return !!(
      profile &&
      typeof profile === 'object' &&
      'playerName' in profile &&
      'playerId' in profile &&
      'createdAt' in profile &&
      'updatedAt' in profile &&
      typeof (profile as UserProfile).playerName === 'string' &&
      typeof (profile as UserProfile).playerId === 'string' &&
      typeof (profile as UserProfile).createdAt === 'string' &&
      typeof (profile as UserProfile).updatedAt === 'string' &&
      (profile as UserProfile).playerName.trim().length > 0
    );
  }
}