import { usePWA } from '../../hooks/usePWA';
import './InstallPrompt.css';

export function InstallPrompt() {
  const { isInstallable, isInstalled, isInstalling, showInstallPrompt } = usePWA();

  // Don't show if already installed or not installable
  if (isInstalled || !isInstallable) {
    return null;
  }

  const handleInstall = async () => {
    const accepted = await showInstallPrompt();
    if (accepted) {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
  };

  return (
    <div className="install-prompt">
      <div className="install-prompt-content">
        <div className="install-prompt-icon">📱</div>
        <div className="install-prompt-text">
          <h3>Install Mini Games</h3>
          <p>Get quick access to your games. Install our app for a better experience!</p>
        </div>
        <div className="install-prompt-actions">
          <button 
            className="install-button"
            onClick={handleInstall}
            disabled={isInstalling}
          >
            {isInstalling ? (
              <>
                <span className="loading-spinner"></span>
                Installing...
              </>
            ) : (
              <>
                <span className="install-icon">⬇️</span>
                Install App
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}