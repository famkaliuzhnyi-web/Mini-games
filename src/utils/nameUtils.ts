/**
 * Utility functions for handling player names
 */

/**
 * Extract the first 3 characters from a name for profile initials
 * @param name - The player name
 * @returns The first 3 characters in uppercase, or the full name if shorter than 3 characters
 */
export function getProfileInitials(name: string): string {
  if (!name || typeof name !== 'string') {
    return '???';
  }
  
  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    return '???';
  }
  
  // Extract first 3 characters and convert to uppercase
  return trimmedName.substring(0, 3).toUpperCase();
}