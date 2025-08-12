import React, { useState } from 'react';
import { UserService } from '../services/UserService';
import './Profile.css';

interface ProfileProps {
  playerName: string;
  onNameUpdate: (newName: string) => void;
  onBack: () => void;
}

export const Profile: React.FC<ProfileProps> = ({
  playerName,
  onNameUpdate,
  onBack
}) => {
  const [editName, setEditName] = useState(playerName);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const userService = UserService.getInstance();

  const handleSave = async () => {
    const trimmedName = editName.trim();
    if (!trimmedName || trimmedName === playerName) {
      setIsEditing(false);
      setEditName(playerName);
      return;
    }

    setIsSaving(true);
    try {
      const updatedProfile = userService.updatePlayerName(trimmedName);
      if (updatedProfile) {
        onNameUpdate(updatedProfile.playerName);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to update name:', error);
      // Reset to original name on error
      setEditName(playerName);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditName(playerName);
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSaving) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const profile = userService.loadProfile();

  return (
    <div className="profile">
      <div className="profile-content">
        <div className="profile-header">
          <button className="profile-back-btn" onClick={onBack} aria-label="Go back">
            ← Back
          </button>
          <h1>Profile</h1>
        </div>

        <div className="profile-section">
          <div className="profile-avatar">
            <span className="avatar-emoji">👤</span>
          </div>

          <div className="profile-info">
            <div className="profile-field">
              <label>Player Name</label>
              {isEditing ? (
                <div className="edit-name-container">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="edit-name-input"
                    maxLength={20}
                    autoFocus
                    disabled={isSaving}
                  />
                  <div className="edit-name-actions">
                    <button 
                      onClick={handleSave}
                      disabled={isSaving || !editName.trim()}
                      className="save-btn"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button 
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="cancel-btn"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="display-name-container">
                  <span className="display-name">{playerName}</span>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="edit-btn"
                    aria-label="Edit name"
                  >
                    ✏️ Edit
                  </button>
                </div>
              )}
            </div>

            {profile && (
              <div className="profile-metadata">
                <div className="metadata-item">
                  <span className="metadata-label">Player ID:</span>
                  <span className="metadata-value">{profile.playerId}</span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Created:</span>
                  <span className="metadata-value">
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Last Updated:</span>
                  <span className="metadata-value">
                    {new Date(profile.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="profile-help">
          <h3>💡 Profile Tips</h3>
          <ul>
            <li>Your name is saved automatically and will persist between visits</li>
            <li>Choose a name that represents you in the games</li>
            <li>You can change your name anytime from this profile page</li>
            <li>Your game progress is linked to your player profile</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Profile;