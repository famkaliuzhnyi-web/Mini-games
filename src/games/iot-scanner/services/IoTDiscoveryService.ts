/**
 * IoT Device Discovery Service
 * 
 * Browser-compatible IoT device discovery using HTTP requests
 * to common device endpoints and ports.
 */

import type { IoTDevice, DeviceType, ScanConfig, ScanProgress, DeviceEndpoint } from '../types';

// Common IoT device ports and their associated services
const COMMON_PORTS = [
  { port: 80, service: 'HTTP', description: 'Web interface' },
  { port: 443, service: 'HTTPS', description: 'Secure web interface' },
  { port: 8080, service: 'HTTP-Alt', description: 'Alternative HTTP' },
  { port: 8081, service: 'HTTP-Alt', description: 'Alternative HTTP' },
  { port: 8443, service: 'HTTPS-Alt', description: 'Alternative HTTPS' },
  { port: 81, service: 'HTTP', description: 'Router admin' },
  { port: 631, service: 'IPP', description: 'Printer service' },
  { port: 1883, service: 'MQTT', description: 'MQTT broker' },
  { port: 5000, service: 'UPnP', description: 'UPnP service' },
  { port: 554, service: 'RTSP', description: 'Camera stream' }
];

// Common device endpoints to check for identification
const DEVICE_ENDPOINTS = [
  { path: '/', expected: 'web interface' },
  { path: '/info', expected: 'device info' },
  { path: '/status', expected: 'device status' },
  { path: '/api', expected: 'API endpoint' },
  { path: '/api/v1', expected: 'API v1' },
  { path: '/device-desc.xml', expected: 'UPnP description' },
  { path: '/description.xml', expected: 'UPnP description' },
  { path: '/admin', expected: 'admin interface' },
  { path: '/management', expected: 'management interface' }
];

export class IoTDiscoveryService {
  private abortController: AbortController | null = null;
  private onProgressUpdate: ((progress: ScanProgress) => void) | null = null;

  /**
   * Detect the local network range by analyzing current IP
   */
  public async detectNetworkRange(): Promise<string> {
    try {
      // Try to get local IP using WebRTC
      const localIP = await this.getLocalIP();
      if (localIP) {
        const parts = localIP.split('.');
        if (parts.length === 4) {
          // Assume /24 subnet for most home networks
          return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
        }
      }
    } catch (error) {
      console.warn('Could not detect network range:', error);
    }
    
    // Default to common home network range
    return '192.168.1.0/24';
  }

  /**
   * Get local IP address using WebRTC
   */
  private async getLocalIP(): Promise<string | null> {
    return new Promise((resolve) => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candidate = event.candidate.candidate;
          const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
          if (ipMatch && !ipMatch[1].startsWith('169.254')) {
            resolve(ipMatch[1]);
            pc.close();
          }
        }
      };

      // Create data channel to trigger ICE gathering
      pc.createDataChannel('');
      pc.createOffer().then(offer => pc.setLocalDescription(offer));

      // Timeout after 3 seconds
      setTimeout(() => {
        pc.close();
        resolve(null);
      }, 3000);
    });
  }

  /**
   * Generate IP addresses from CIDR notation
   */
  private generateIPRange(cidr: string): string[] {
    const [network, prefixLength] = cidr.split('/');
    const prefix = parseInt(prefixLength, 10);
    
    if (prefix !== 24) {
      // For simplicity, only support /24 networks
      console.warn('Only /24 networks supported, defaulting to 192.168.1.0/24');
      return this.generateIPRange('192.168.1.0/24');
    }

    const networkParts = network.split('.');
    const baseIP = `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}`;
    
    const ips: string[] = [];
    // Skip .0 (network) and .255 (broadcast), scan 1-254
    for (let i = 1; i <= 254; i++) {
      ips.push(`${baseIP}.${i}`);
    }
    
    return ips;
  }

  /**
   * Check if a device is responsive on a specific port
   */
  private async checkPort(ip: string, port: number, timeout: number = 3000): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Try both HTTP and HTTPS
      const protocols = port === 443 || port === 8443 ? ['https'] : ['http'];
      
      for (const protocol of protocols) {
        try {
          await fetch(`${protocol}://${ip}:${port}/`, {
            method: 'HEAD',
            mode: 'no-cors', // Allow cross-origin requests
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          return true;
        } catch {
          // Continue to next protocol
        }
      }
      
      clearTimeout(timeoutId);
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Attempt to identify device type and get device info
   */
  private async identifyDevice(ip: string, activePorts: number[]): Promise<Partial<IoTDevice>> {
    const device: Partial<IoTDevice> = {
      ip,
      services: [],
      controlEndpoints: []
    };

    // Try to get device information from HTTP endpoints
    for (const port of activePorts) {
      const protocol = port === 443 || port === 8443 ? 'https' : 'http';
      
      for (const endpoint of DEVICE_ENDPOINTS) {
        try {
          await fetch(`${protocol}://${ip}:${port}${endpoint.path}`, {
            method: 'GET',
            mode: 'no-cors',
            signal: this.abortController?.signal
          });

          // Add service info
          const portInfo = COMMON_PORTS.find(p => p.port === port);
          if (portInfo && !device.services?.includes(portInfo.service)) {
            device.services?.push(portInfo.service);
          }

          // Add control endpoint
          device.controlEndpoints?.push({
            name: `${endpoint.expected} (${protocol.toUpperCase()})`,
            path: endpoint.path,
            method: 'GET',
            description: `Access ${endpoint.expected} via ${protocol.toUpperCase()}`
          });

        } catch {
          // Endpoint not accessible, continue
        }
      }
    }

    // Determine device type based on ports and services
    device.type = this.guessDeviceType(activePorts, device.services || []);
    device.name = this.generateDeviceName(ip, device.type);

    return device;
  }

  /**
   * Guess device type based on open ports and services
   */
  private guessDeviceType(ports: number[], services: string[]): DeviceType {
    // Router detection
    if (ports.includes(80) || ports.includes(81)) {
      const ipParts = this.parseIP(this.currentScanIP || '');
      if (ipParts && (ipParts[3] === 1 || ipParts[3] === 254)) {
        return 'router';
      }
    }

    // Printer detection
    if (ports.includes(631) || services.includes('IPP')) {
      return 'printer';
    }

    // Camera detection
    if (ports.includes(554) || services.includes('RTSP')) {
      return 'camera';
    }

    // Smart hub detection (common ports)
    if (ports.includes(8080) && ports.includes(443)) {
      return 'smart-hub';
    }

    // ESP32/Arduino detection (common development ports)
    if (ports.includes(80) && !ports.includes(443)) {
      return 'esp32';
    }

    return 'unknown';
  }

  private currentScanIP: string = '';

  private parseIP(ip: string): number[] | null {
    const parts = ip.split('.').map(p => parseInt(p, 10));
    return parts.length === 4 && parts.every(p => p >= 0 && p <= 255) ? parts : null;
  }

  /**
   * Generate a friendly device name
   */
  private generateDeviceName(ip: string, type: DeviceType): string {
    const typeNames = {
      router: 'Router',
      'smart-hub': 'Smart Hub',
      camera: 'IP Camera',
      printer: 'Network Printer',
      'smart-tv': 'Smart TV',
      esp32: 'ESP32 Device',
      arduino: 'Arduino Device',
      unknown: 'Unknown Device'
    };

    return `${typeNames[type]} (${ip})`;
  }

  /**
   * Scan for IoT devices on the network
   */
  public async scanNetwork(
    config: ScanConfig,
    onProgress?: (progress: ScanProgress) => void
  ): Promise<IoTDevice[]> {
    this.abortController = new AbortController();
    this.onProgressUpdate = onProgress || null;

    const devices: IoTDevice[] = [];
    const ipAddresses = this.generateIPRange(config.networkRange);
    const totalTargets = ipAddresses.length;
    let completed = 0;

    // Update progress
    const updateProgress = (currentTarget: string) => {
      const progress: ScanProgress = {
        isScanning: true,
        progress: Math.round((completed / totalTargets) * 100),
        currentTarget,
        devicesFound: devices.length,
        totalTargets
      };
      this.onProgressUpdate?.(progress);
    };

    // Process IPs in batches to avoid overwhelming the browser
    const batchSize = Math.min(config.concurrent, 10);
    
    for (let i = 0; i < ipAddresses.length; i += batchSize) {
      const batch = ipAddresses.slice(i, i + batchSize);
      
      const promises = batch.map(async (ip) => {
        this.currentScanIP = ip;
        updateProgress(ip);

        try {
          const activePorts: number[] = [];
          
          // Check common ports
          for (const portInfo of COMMON_PORTS.slice(0, 5)) { // Limit to first 5 ports for speed
            if (await this.checkPort(ip, portInfo.port, config.timeout)) {
              activePorts.push(portInfo.port);
            }
          }

          if (activePorts.length > 0) {
            const deviceInfo = await this.identifyDevice(ip, activePorts);
            
            const device: IoTDevice = {
              id: ip,
              name: deviceInfo.name || `Device ${ip}`,
              ip,
              type: deviceInfo.type || 'unknown',
              status: 'online',
              services: deviceInfo.services || [],
              lastSeen: new Date().toISOString(),
              controlEndpoints: deviceInfo.controlEndpoints || []
            };

            devices.push(device);
          }
        } catch {
          // Device not accessible or scan aborted
        }

        completed++;
      });

      await Promise.all(promises);

      // Check if scan was aborted
      if (this.abortController.signal.aborted) {
        break;
      }

      // Small delay between batches to prevent browser freezing
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Final progress update
    this.onProgressUpdate?.({
      isScanning: false,
      progress: 100,
      currentTarget: '',
      devicesFound: devices.length,
      totalTargets
    });

    return devices;
  }

  /**
   * Stop current scan
   */
  public stopScan(): void {
    this.abortController?.abort();
    this.onProgressUpdate?.({
      isScanning: false,
      progress: 0,
      currentTarget: '',
      devicesFound: 0,
      totalTargets: 0
    });
  }

  /**
   * Test device connectivity
   */
  public async testDevice(device: IoTDevice): Promise<boolean> {
    try {
      const port = device.port || 80;
      return await this.checkPort(device.ip, port, 5000);
    } catch {
      return false;
    }
  }

  /**
   * Execute a control action on a device
   */
  public async controlDevice(
    device: IoTDevice,
    endpoint: DeviceEndpoint,
    parameters?: Record<string, unknown>
  ): Promise<{ success: boolean; response?: unknown; error?: string }> {
    try {
      const port = device.port || (device.services.includes('HTTPS') ? 443 : 80);
      const protocol = device.services.includes('HTTPS') ? 'https' : 'http';
      
      const url = `${protocol}://${device.ip}:${port}${endpoint.path}`;
      
      const options: RequestInit = {
        method: endpoint.method,
        mode: 'cors', // Try CORS first for control actions
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (endpoint.method !== 'GET' && parameters) {
        options.body = JSON.stringify(parameters);
      }

      const response = await fetch(url, options);
      
      if (response.ok) {
        const data = await response.text();
        return { success: true, response: data };
      } else {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}