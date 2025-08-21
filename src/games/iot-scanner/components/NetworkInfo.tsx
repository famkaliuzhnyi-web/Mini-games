/**
 * Network Info Component - Shows network configuration and scan history
 */
import React, { useState } from 'react';
import type { ScanConfig, ScanResult } from '../types';

interface NetworkInfoProps {
  scanConfig: ScanConfig;
  onConfigUpdate: (config: Partial<ScanConfig>) => void;
  lastScanTime: string;
  scanHistory: ScanResult[];
}

export const NetworkInfo: React.FC<NetworkInfoProps> = ({
  scanConfig,
  onConfigUpdate,
  lastScanTime,
  scanHistory
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [tempConfig, setTempConfig] = useState(scanConfig);

  const handleConfigSave = () => {
    onConfigUpdate(tempConfig);
    setShowConfig(false);
  };

  const handleConfigCancel = () => {
    setTempConfig(scanConfig);
    setShowConfig(false);
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return 'Never';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="network-info">
      <div className="network-info-header">
        <h3>🌐 Network Configuration</h3>
        <button 
          className="btn btn-small"
          onClick={() => setShowConfig(!showConfig)}
        >
          ⚙️ {showConfig ? 'Hide' : 'Settings'}
        </button>
      </div>

      <div className="network-status">
        <div className="status-item">
          <span className="status-label">Network Range:</span>
          <span className="status-value">{scanConfig.networkRange}</span>
        </div>
        <div className="status-item">
          <span className="status-label">Last Scan:</span>
          <span className="status-value">
            {lastScanTime ? formatTimestamp(lastScanTime) : 'Never'}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">Timeout:</span>
          <span className="status-value">{scanConfig.timeout}ms</span>
        </div>
      </div>

      {showConfig && (
        <div className="config-panel">
          <div className="config-section">
            <label htmlFor="network-range">Network Range (CIDR):</label>
            <input
              id="network-range"
              type="text"
              value={tempConfig.networkRange}
              onChange={(e) => setTempConfig(prev => ({ ...prev, networkRange: e.target.value }))}
              placeholder="192.168.1.0/24"
              className="config-input"
            />
            <small>Example: 192.168.1.0/24 for typical home networks</small>
          </div>

          <div className="config-section">
            <label htmlFor="timeout">Request Timeout (ms):</label>
            <input
              id="timeout"
              type="number"
              min="1000"
              max="10000"
              step="500"
              value={tempConfig.timeout}
              onChange={(e) => setTempConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
              className="config-input"
            />
            <small>Higher values = more thorough but slower scan</small>
          </div>

          <div className="config-section">
            <label htmlFor="concurrent">Concurrent Requests:</label>
            <input
              id="concurrent"
              type="number"
              min="1"
              max="20"
              value={tempConfig.concurrent}
              onChange={(e) => setTempConfig(prev => ({ ...prev, concurrent: parseInt(e.target.value) }))}
              className="config-input"
            />
            <small>Lower values = slower but less resource intensive</small>
          </div>

          <div className="config-section">
            <label>Ports to Scan:</label>
            <div className="ports-config">
              <input
                type="text"
                value={tempConfig.ports.join(', ')}
                onChange={(e) => {
                  const ports = e.target.value.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p) && p > 0 && p < 65536);
                  setTempConfig(prev => ({ ...prev, ports }));
                }}
                placeholder="80, 443, 8080, 8081, 81"
                className="config-input"
              />
              <small>Comma-separated port numbers (e.g., 80, 443, 8080)</small>
            </div>
          </div>

          <div className="config-actions">
            <button className="btn btn-primary" onClick={handleConfigSave}>
              ✅ Save
            </button>
            <button className="btn btn-secondary" onClick={handleConfigCancel}>
              ❌ Cancel
            </button>
          </div>
        </div>
      )}

      {scanHistory.length > 0 && (
        <div className="scan-history">
          <h4>📊 Scan History</h4>
          <div className="history-list">
            {scanHistory.slice(0, 5).map((scan, index) => (
              <div key={index} className="history-item">
                <div className="history-time">
                  {formatTimestamp(scan.timestamp)}
                </div>
                <div className="history-details">
                  <span className="history-devices">
                    {scan.devicesFound} device{scan.devicesFound !== 1 ? 's' : ''}
                  </span>
                  <span className="history-range">
                    {scan.networkRange}
                  </span>
                  {scan.duration > 0 && (
                    <span className="history-duration">
                      {formatDuration(scan.duration)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkInfo;