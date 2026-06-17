import React, { useState } from 'react';
import { UserService } from '../../services/UserService';
import { useTheme } from '../../hooks/useTheme';
import { useAppUpdate } from '../../hooks/useAppUpdate';
import packageJson from '../../../package.json';
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
  const { currentTheme, availableThemes, setTheme } = useTheme();
  const { status: updateStatus, checkForUpdate, applyUpdate } = useAppUpdate();

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
      setEditName(playerName);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditName(playerName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSaving) handleSave();
    else if (e.key === 'Escape') handleCancel();
  };

  const profile = userService.loadProfile();

  return (
    <div className="profile">
      <div className="profile-header">
        <button className="profile-back-btn" onClick={onBack} aria-label="Go back">
          ← Back
        </button>
        <h1>Profile</h1>
      </div>

      {/* Name + metadata */}
      <div className="profile-card">
        <div>
          <div className="profile-card-label">Player Name</div>
          {isEditing ? (
            <div className="edit-name-container">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyDown}
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
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={handleCancel} disabled={isSaving} className="cancel-btn">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="display-name-row">
              <span className="display-name">{playerName}</span>
              <button onClick={() => setIsEditing(true)} className="edit-btn" aria-label="Edit name">
                Edit
              </button>
            </div>
          )}
        </div>

        {profile && (
          <div className="profile-metadata">
            <div className="metadata-item">
              <span className="metadata-label">Player ID</span>
              <span className="metadata-value">{profile.playerId}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Created</span>
              <span className="metadata-value">{new Date(profile.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Updated</span>
              <span className="metadata-value">{new Date(profile.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* App / updates */}
      <div className="profile-card">
        <div className="profile-card-label">App</div>
        <div className="update-row">
          <div className="update-version">
            <span className="metadata-label">Version</span>
            <span className="metadata-value">{packageJson.version}</span>
          </div>
          {updateStatus === 'available' ? (
            <button className="save-btn" onClick={applyUpdate}>
              Update &amp; Reload
            </button>
          ) : (
            <button
              className="edit-btn"
              onClick={checkForUpdate}
              disabled={updateStatus === 'checking'}
            >
              {updateStatus === 'checking' ? 'Checking…' : 'Check for Updates'}
            </button>
          )}
        </div>
        {updateStatus === 'latest' && (
          <p className="update-status">Already on the latest version.</p>
        )}
        {updateStatus === 'available' && (
          <p className="update-status update-status--available">New version ready — click to apply.</p>
        )}
      </div>

      {/* Theme picker */}
      <div className="profile-card">
        <div className="profile-card-label">Theme</div>
        <div className="theme-selector">
          {availableThemes.map((theme) => (
            <button
              key={theme.name}
              onClick={() => setTheme(theme.name)}
              className={`theme-option ${currentTheme === theme.name ? 'active' : ''}`}
            >
              <div
                className="theme-swatch"
                style={{ background: theme.swatchBg }}
              >
                <div
                  className="theme-swatch-accent"
                  style={{ background: theme.swatchAccent }}
                />
              </div>
              <div className="theme-info">
                <span className="theme-name">{theme.displayName}</span>
                <span className="theme-description">{theme.description}</span>
              </div>
              {currentTheme === theme.name && (
                <span className="theme-active-badge">Active</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Profile;
