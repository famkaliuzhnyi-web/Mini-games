/**
 * IoT Scanner Application Component - Main application implementation
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useGameSave } from '../../hooks/useGameSave';
import type { GameController, GameState, GameConfig } from '../../types/game';
import type { IoTScannerData, IoTDevice, ScanConfig, ScanProgress } from './types';
import { IoTDiscoveryService } from './services/IoTDiscoveryService';
import { DeviceList } from './components/DeviceList';
import { ScanControls } from './components/ScanControls';
import { DeviceDetails } from './components/DeviceDetails';
import { NetworkInfo } from './components/NetworkInfo';
import './IoTScanner.css';

// IoT Scanner configuration
const IOT_SCANNER_CONFIG: GameConfig = {
  id: 'iot-scanner',
  name: 'IoT Scanner',
  description: 'Scan local network for IoT devices and manage them',
  version: '1.0.0',
  autoSaveEnabled: true,
  autoSaveIntervalMs: 10000 // Save every 10 seconds
};

// IoT Scanner controller
class IoTScannerController implements GameController<IoTScannerData> {
  config = IOT_SCANNER_CONFIG;

  getInitialState(): GameState<IoTScannerData> {
    const now = new Date().toISOString();
    
    return {
      gameId: 'iot-scanner',
      playerId: '',
      version: this.config.version,
      createdAt: now,
      lastModified: now,
      isComplete: false, // IoT Scanner is never "complete" in the traditional sense
      data: {
        devices: [],
        scanHistory: [],
        scanConfig: {
          networkRange: '192.168.1.0/24',
          timeout: 3000,
          ports: [80, 443, 8080, 8081, 81],
          concurrent: 5
        },
        lastScanTime: '',
        isScanning: false,
        selectedDevice: null,
        networkInterface: 'auto'
      }
    };
  }

  validateState(state: GameState<IoTScannerData>): boolean {
    return !!(
      state.data.devices &&
      Array.isArray(state.data.devices) &&
      state.data.scanConfig &&
      typeof state.data.scanConfig.networkRange === 'string'
    );
  }

  createSaveData(state: GameState<IoTScannerData>) {
    return {
      devices: state.data.devices,
      scanHistory: state.data.scanHistory,
      scanConfig: state.data.scanConfig,
      lastScanTime: state.data.lastScanTime,
      networkInterface: state.data.networkInterface
    };
  }

  restoreFromSave(saveData: Partial<IoTScannerData>): Partial<IoTScannerData> {
    return {
      devices: saveData.devices || [],
      scanHistory: saveData.scanHistory || [],
      scanConfig: saveData.scanConfig || {
        networkRange: '192.168.1.0/24',
        timeout: 3000,
        ports: [80, 443, 8080, 8081, 81],
        concurrent: 5
      },
      lastScanTime: saveData.lastScanTime || '',
      isScanning: false,
      selectedDevice: null,
      networkInterface: saveData.networkInterface || 'auto'
    };
  }
}

interface IoTScannerGameProps {
  playerId: string;
}

export const IoTScannerGame: React.FC<IoTScannerGameProps> = ({ playerId }) => {
  const controller = React.useMemo(() => new IoTScannerController(), []);
  
  // Initialize game state with playerId
  const initialState = React.useMemo(() => {
    const state = controller.getInitialState();
    state.playerId = playerId;
    return state;
  }, [controller, playerId]);

  const {
    gameState,
    setGameState,
    saveGame,
    loadGame,
    dropSave,
    hasSave,
    isLoading,
    lastSaveEvent,
    autoSaveEnabled,
    toggleAutoSave
  } = useGameSave<IoTScannerData>({
    gameId: controller.config.id,
    playerId,
    gameConfig: controller.config,
    initialState
  });

  const [discoveryService] = useState(() => new IoTDiscoveryService());
  const [scanProgress, setScanProgress] = useState<ScanProgress>({
    isScanning: false,
    progress: 0,
    currentTarget: '',
    devicesFound: 0,
    totalTargets: 0
  });

  // Initialize network range on component mount
  useEffect(() => {
    const initializeNetwork = async () => {
      try {
        const detectedRange = await discoveryService.detectNetworkRange();
        setGameState({
          ...gameState,
          data: {
            ...gameState.data,
            scanConfig: {
              ...gameState.data.scanConfig,
              networkRange: detectedRange
            }
          },
          lastModified: new Date().toISOString()
        });
      } catch (error) {
        console.warn('Failed to detect network range:', error);
      }
    };

    if (gameState.data.scanConfig.networkRange === '192.168.1.0/24' && 
        gameState.data.networkInterface === 'auto') {
      initializeNetwork();
    }
  }, [discoveryService, gameState.data.scanConfig.networkRange, gameState.data.networkInterface, setGameState]);

  // Start network scan
  const startScan = useCallback(async () => {
    if (gameState.data.isScanning) return;

    setGameState({
      ...gameState,
      data: { ...gameState.data, isScanning: true },
      lastModified: new Date().toISOString()
    });

    try {
      const devices = await discoveryService.scanNetwork(
        gameState.data.scanConfig,
        setScanProgress
      );

      const scanResult = {
        timestamp: new Date().toISOString(),
        devicesFound: devices.length,
        networkRange: gameState.data.scanConfig.networkRange,
        duration: 0 // Will be calculated
      };

      setGameState({
        ...gameState,
        data: {
          ...gameState.data,
          devices,
          isScanning: false,
          lastScanTime: scanResult.timestamp,
          scanHistory: [scanResult, ...gameState.data.scanHistory.slice(0, 9)] // Keep last 10 scans
        },
        lastModified: new Date().toISOString()
      });

    } catch (error) {
      console.error('Scan failed:', error);
      setGameState({
        ...gameState,
        data: { ...gameState.data, isScanning: false },
        lastModified: new Date().toISOString()
      });
    }
  }, [gameState.data.isScanning, gameState.data.scanConfig, discoveryService, setGameState]);

  // Stop current scan
  const stopScan = useCallback(() => {
    discoveryService.stopScan();
    setGameState({
      ...gameState,
      data: { ...gameState.data, isScanning: false },
      lastModified: new Date().toISOString()
    });
  }, [discoveryService, gameState, setGameState]);

  // Select a device
  const selectDevice = useCallback((deviceId: string | null) => {
    setGameState({
      ...gameState,
      data: { ...gameState.data, selectedDevice: deviceId },
      lastModified: new Date().toISOString()
    });
  }, [gameState, setGameState]);

  // Update scan configuration
  const updateScanConfig = useCallback((config: Partial<ScanConfig>) => {
    setGameState({
      ...gameState,
      data: {
        ...gameState.data,
        scanConfig: { ...gameState.data.scanConfig, ...config }
      },
      lastModified: new Date().toISOString()
    });
  }, [gameState, setGameState]);

  // Test device connectivity
  const testDevice = useCallback(async (device: IoTDevice) => {
    try {
      const isOnline = await discoveryService.testDevice(device);
      
      setGameState({
        ...gameState,
        data: {
          ...gameState.data,
          devices: gameState.data.devices.map((d: IoTDevice) => 
            d.id === device.id 
              ? { ...d, status: isOnline ? 'online' : 'offline', lastSeen: new Date().toISOString() }
              : d
          )
        },
        lastModified: new Date().toISOString()
      });

      return isOnline;
    } catch (error) {
      console.error('Device test failed:', error);
      return false;
    }
  }, [discoveryService, gameState, setGameState]);

  // Control device
  const controlDevice = useCallback(async (device: IoTDevice, endpointIndex: number, parameters?: Record<string, unknown>) => {
    const endpoint = device.controlEndpoints[endpointIndex];
    if (!endpoint) return { success: false, error: 'Invalid endpoint' };

    try {
      const result = await discoveryService.controlDevice(device, endpoint, parameters);
      
      // Update device last seen time if successful
      if (result.success) {
        setGameState({
          ...gameState,
          data: {
            ...gameState.data,
            devices: gameState.data.devices.map((d: IoTDevice) => 
              d.id === device.id 
                ? { ...d, lastSeen: new Date().toISOString() }
                : d
            )
          },
          lastModified: new Date().toISOString()
        });
      }

      return result;
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, [discoveryService, gameState, setGameState]);

  const selectedDevice = gameState.data.selectedDevice 
    ? gameState.data.devices.find((d: IoTDevice) => d.id === gameState.data.selectedDevice)
    : null;

  if (isLoading) {
    return (
      <div className="iot-scanner-loading">
        <div className="loading-spinner">🔄</div>
        <p>Loading IoT Scanner...</p>
      </div>
    );
  }

  return (
    <div className="iot-scanner">
      <div className="iot-scanner-header">
        <h1>🌐 IoT Network Scanner</h1>
        <p>Discover and manage IoT devices on your local network</p>
      </div>

      <div className="iot-scanner-main">
        <div className="iot-scanner-left">
          <NetworkInfo 
            scanConfig={gameState.data.scanConfig}
            onConfigUpdate={updateScanConfig}
            lastScanTime={gameState.data.lastScanTime}
            scanHistory={gameState.data.scanHistory}
          />
          
          <ScanControls
            isScanning={gameState.data.isScanning}
            scanProgress={scanProgress}
            onStartScan={startScan}
            onStopScan={stopScan}
            devicesFound={gameState.data.devices.length}
          />

          <DeviceList
            devices={gameState.data.devices}
            selectedDevice={gameState.data.selectedDevice}
            onSelectDevice={selectDevice}
            onTestDevice={testDevice}
          />
        </div>

        <div className="iot-scanner-right">
          {selectedDevice ? (
            <DeviceDetails
              device={selectedDevice}
              onControlDevice={(endpointIndex, parameters) => 
                controlDevice(selectedDevice, endpointIndex, parameters)
              }
              onTestDevice={() => testDevice(selectedDevice)}
            />
          ) : (
            <div className="no-device-selected">
              <h3>No Device Selected</h3>
              <p>Select a device from the list to view details and controls.</p>
              <div className="scan-hint">
                {gameState.data.devices.length === 0 && !gameState.data.isScanning && (
                  <p>Click "Start Scan" to discover IoT devices on your network.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="iot-scanner-footer">
        <div className="game-controls">
          <button 
            onClick={saveGame}
            disabled={isLoading}
            className="btn btn-primary"
          >
            💾 Save
          </button>
          
          <button 
            onClick={loadGame}
            disabled={!hasSave || isLoading}
            className="btn btn-secondary"
          >
            📁 Load
          </button>
          
          <button
            onClick={dropSave}
            disabled={!hasSave || isLoading}
            className="btn btn-danger"
          >
            🗑️ Clear Data
          </button>

          <label className="auto-save-toggle">
            <input
              type="checkbox"
              checked={autoSaveEnabled}
              onChange={toggleAutoSave}
            />
            Auto-save
          </label>
        </div>

        {lastSaveEvent && (
          <div className="save-status">
            ✅ Saved {new Date(lastSaveEvent.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default IoTScannerGame;