/**
 * Scan Controls Component - Controls for network scanning
 */
import React from 'react';
import type { ScanProgress } from '../types';

interface ScanControlsProps {
  isScanning: boolean;
  scanProgress: ScanProgress;
  onStartScan: () => void;
  onStopScan: () => void;
  devicesFound: number;
}

export const ScanControls: React.FC<ScanControlsProps> = ({
  isScanning,
  scanProgress,
  onStartScan,
  onStopScan,
  devicesFound
}) => {
  return (
    <div className="scan-controls">
      <div className="scan-controls-header">
        <h3>Network Scan</h3>
      </div>
      
      <div className="scan-actions">
        {!isScanning ? (
          <button 
            className="btn btn-primary scan-btn"
            onClick={onStartScan}
          >
            🔍 Start Scan
          </button>
        ) : (
          <button 
            className="btn btn-danger scan-btn"
            onClick={onStopScan}
          >
            ⏹️ Stop Scan
          </button>
        )}
      </div>

      {isScanning && (
        <div className="scan-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${scanProgress.progress}%` }}
            />
          </div>
          
          <div className="progress-info">
            <span className="progress-percentage">
              {scanProgress.progress}%
            </span>
            <span className="progress-current">
              Scanning: {scanProgress.currentTarget}
            </span>
          </div>
          
          <div className="scan-stats">
            <div className="stat">
              <span className="stat-label">Found:</span>
              <span className="stat-value">{scanProgress.devicesFound}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Progress:</span>
              <span className="stat-value">
                {scanProgress.totalTargets > 0 ? 
                  `${Math.round((scanProgress.progress / 100) * scanProgress.totalTargets)}/${scanProgress.totalTargets}` :
                  '0/0'
                }
              </span>
            </div>
          </div>
        </div>
      )}

      {!isScanning && devicesFound > 0 && (
        <div className="scan-summary">
          <div className="summary-item">
            <span className="summary-icon">✅</span>
            <span className="summary-text">
              Found {devicesFound} device{devicesFound !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {!isScanning && devicesFound === 0 && (
        <div className="scan-summary">
          <div className="summary-item">
            <span className="summary-icon">ℹ️</span>
            <span className="summary-text">
              No devices found. Try adjusting the network range.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanControls;