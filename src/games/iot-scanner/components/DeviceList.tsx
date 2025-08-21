/**
 * Device List Component - Shows discovered IoT devices
 */
import React from 'react';
import type { IoTDevice } from '../types';

interface DeviceListProps {
  devices: IoTDevice[];
  selectedDevice: string | null;
  onSelectDevice: (deviceId: string | null) => void;
  onTestDevice: (device: IoTDevice) => Promise<boolean>;
}

export const DeviceList: React.FC<DeviceListProps> = ({
  devices,
  selectedDevice,
  onSelectDevice,
  onTestDevice
}) => {
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

  const handleTestDevice = async (e: React.MouseEvent, device: IoTDevice) => {
    e.stopPropagation(); // Prevent device selection
    await onTestDevice(device);
  };

  if (devices.length === 0) {
    return (
      <div className="device-list empty">
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No Devices Found</h3>
          <p>Start a scan to discover IoT devices on your network.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="device-list">
      <div className="device-list-header">
        <h3>Discovered Devices ({devices.length})</h3>
      </div>
      
      <div className="device-list-items">
        {devices.map((device) => (
          <div
            key={device.id}
            className={`device-item ${selectedDevice === device.id ? 'selected' : ''}`}
            onClick={() => onSelectDevice(device.id)}
          >
            <div className="device-icon">
              {getDeviceIcon(device.type)}
            </div>
            
            <div className="device-info">
              <div className="device-name">{device.name}</div>
              <div className="device-ip">{device.ip}</div>
              <div className="device-services">
                {device.services.slice(0, 3).map((service, index) => (
                  <span key={index} className="service-tag">
                    {service}
                  </span>
                ))}
                {device.services.length > 3 && (
                  <span className="service-tag more">
                    +{device.services.length - 3}
                  </span>
                )}
              </div>
            </div>
            
            <div className="device-status">
              <div 
                className="status-indicator"
                style={{ backgroundColor: getStatusColor(device.status) }}
                title={`Status: ${device.status}`}
              />
              <button
                className="test-btn"
                onClick={(e) => handleTestDevice(e, device)}
                title="Test connectivity"
              >
                🔍
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeviceList;