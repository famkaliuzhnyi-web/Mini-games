/**
 * IoT Scanner application type definitions
 */

// IoT device types we can detect
export type DeviceType = 'router' | 'smart-hub' | 'camera' | 'printer' | 'smart-tv' | 'esp32' | 'arduino' | 'unknown';

// IoT device discovery status
export type DeviceStatus = 'online' | 'offline' | 'unknown';

// IoT device interface
export interface IoTDevice {
  id: string;              // Unique identifier (usually IP address)
  name: string;            // Device name or hostname
  ip: string;              // IP address
  port?: number;           // Port number if known
  type: DeviceType;        // Type of device
  manufacturer?: string;   // Device manufacturer if detectable
  model?: string;          // Device model if detectable
  status: DeviceStatus;    // Current connection status
  services: string[];      // Available services (HTTP, HTTPS, SSH, etc.)
  lastSeen: string;        // Last time device responded
  controlEndpoints: DeviceEndpoint[]; // Available control endpoints
}

// Device control endpoints
export interface DeviceEndpoint {
  name: string;            // Friendly name for the endpoint
  path: string;            // URL path
  method: 'GET' | 'POST' | 'PUT';
  description: string;     // What this endpoint does
  parameters?: Record<string, string>; // Parameters if any
}

// Scan progress information
export interface ScanProgress {
  isScanning: boolean;
  progress: number;        // 0-100
  currentTarget: string;   // Current IP being scanned
  devicesFound: number;    // Number of devices discovered
  totalTargets: number;    // Total IPs to scan
}

// Network scan configuration
export interface ScanConfig {
  networkRange: string;    // e.g., "192.168.1.0/24"
  timeout: number;         // Request timeout in ms
  ports: number[];         // Ports to check
  concurrent: number;      // Number of concurrent requests
}

// IoT Scanner game specific data
export interface IoTScannerData extends Record<string, unknown> {
  devices: IoTDevice[];           // Discovered devices
  scanHistory: ScanResult[];      // Previous scan results
  scanConfig: ScanConfig;         // Current scan configuration
  lastScanTime: string;           // Last successful scan timestamp
  isScanning: boolean;            // Current scan status
  selectedDevice: string | null;  // Currently selected device ID
  networkInterface: string;       // Detected network interface
}

// Scan result for history
export interface ScanResult {
  timestamp: string;
  devicesFound: number;
  networkRange: string;
  duration: number; // Scan duration in seconds
}

// Device control action
export interface DeviceAction {
  deviceId: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT';
  parameters?: Record<string, unknown>;
  timestamp: string;
}