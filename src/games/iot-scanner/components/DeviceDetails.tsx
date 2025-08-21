/**
 * Device Details Component - Shows detailed information and controls for selected device
 */
import React, { useState } from 'react';
import type { IoTDevice } from '../types';

interface DeviceDetailsProps {
  device: IoTDevice;
  onControlDevice: (endpointIndex: number, parameters?: Record<string, unknown>) => Promise<{ success: boolean; response?: unknown; error?: string }>;
  onTestDevice: () => Promise<boolean>;
}

export const DeviceDetails: React.FC<DeviceDetailsProps> = ({
  device,
  onControlDevice,
  onTestDevice
}) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<number>(0);
  const [controlResult, setControlResult] = useState<{ success: boolean; response?: unknown; error?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getDeviceIcon = (type: string) => {
    const icons = {
      router: '📡',
      'smart-hub': '🏠',
      camera: '📹',
      printer: '🖨️',
      'smart-tv': '📺',
      esp32: '🔧',
      arduino: '⚡',
      unknown: '❓'
    };
    return icons[type as keyof typeof icons] || '❓';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      online: '#4CAF50',
      offline: '#f44336',
      unknown: '#ff9800'
    };
    return colors[status as keyof typeof colors] || '#ff9800';
  };

  const handleControlAction = async () => {
    if (device.controlEndpoints.length === 0) return;
    
    setIsLoading(true);
    setControlResult(null);

    try {
      const result = await onControlDevice(selectedEndpoint);
      setControlResult(result);
    } catch (error) {
      setControlResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestDevice = async () => {
    setIsLoading(true);
    try {
      await onTestDevice();
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="device-details">
      <div className="device-details-header">
        <div className="device-title">
          <span className="device-icon-large">
            {getDeviceIcon(device.type)}
          </span>
          <div className="device-title-text">
            <h3>{device.name}</h3>
            <div className="device-type">{device.type.replace('-', ' ')}</div>
          </div>
          <div 
            className="device-status-large"
            style={{ backgroundColor: getStatusColor(device.status) }}
            title={`Status: ${device.status}`}
          >
            {device.status}
          </div>
        </div>
      </div>

      <div className="device-info-grid">
        <div className="info-section">
          <h4>📍 Network Information</h4>
          <div className="info-row">
            <span className="info-label">IP Address:</span>
            <span className="info-value">{device.ip}</span>
          </div>
          {device.port && (
            <div className="info-row">
              <span className="info-label">Port:</span>
              <span className="info-value">{device.port}</span>
            </div>
          )}
          <div className="info-row">
            <span className="info-label">Last Seen:</span>
            <span className="info-value">{formatTimestamp(device.lastSeen)}</span>
          </div>
        </div>

        <div className="info-section">
          <h4>🔧 Device Information</h4>
          {device.manufacturer && (
            <div className="info-row">
              <span className="info-label">Manufacturer:</span>
              <span className="info-value">{device.manufacturer}</span>
            </div>
          )}
          {device.model && (
            <div className="info-row">
              <span className="info-label">Model:</span>
              <span className="info-value">{device.model}</span>
            </div>
          )}
          <div className="info-row">
            <span className="info-label">Type:</span>
            <span className="info-value">{device.type}</span>
          </div>
        </div>

        <div className="info-section">
          <h4>🌐 Services</h4>
          <div className="services-list">
            {device.services.map((service, index) => (
              <span key={index} className="service-badge">
                {service}
              </span>
            ))}
            {device.services.length === 0 && (
              <span className="no-services">No services detected</span>
            )}
          </div>
        </div>

        <div className="info-section">
          <h4>🎮 Device Controls</h4>
          
          <div className="test-connectivity">
            <button 
              className="btn btn-secondary"
              onClick={handleTestDevice}
              disabled={isLoading}
            >
              {isLoading ? '🔄 Testing...' : '🔍 Test Connectivity'}
            </button>
          </div>

          {device.controlEndpoints.length > 0 ? (
            <div className="control-panel">
              <div className="endpoint-selector">
                <label htmlFor="endpoint-select">Available Endpoints:</label>
                <select 
                  id="endpoint-select"
                  value={selectedEndpoint}
                  onChange={(e) => setSelectedEndpoint(parseInt(e.target.value))}
                  className="endpoint-select"
                >
                  {device.controlEndpoints.map((endpoint, index) => (
                    <option key={index} value={index}>
                      {endpoint.name} ({endpoint.method})
                    </option>
                  ))}
                </select>
              </div>

              <div className="endpoint-info">
                <div className="endpoint-details">
                  <strong>Path:</strong> {device.controlEndpoints[selectedEndpoint]?.path}<br/>
                  <strong>Method:</strong> {device.controlEndpoints[selectedEndpoint]?.method}<br/>
                  <strong>Description:</strong> {device.controlEndpoints[selectedEndpoint]?.description}
                </div>
              </div>

              <button 
                className="btn btn-primary control-btn"
                onClick={handleControlAction}
                disabled={isLoading}
              >
                {isLoading ? '🔄 Executing...' : '▶️ Execute Command'}
              </button>

              {controlResult && (
                <div className={`control-result ${controlResult.success ? 'success' : 'error'}`}>
                  <div className="result-header">
                    {controlResult.success ? '✅ Success' : '❌ Error'}
                  </div>
                  <div className="result-content">
                    {controlResult.success ? (
                      <pre>{String(controlResult.response || 'Command executed successfully')}</pre>
                    ) : (
                      <div className="error-message">{controlResult.error}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="no-controls">
              <p>No control endpoints available for this device.</p>
              <p className="hint">
                This device may not support remote control or may require authentication.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeviceDetails;