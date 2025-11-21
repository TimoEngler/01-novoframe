/**
 * Mock BLE Service for Expo Go
 * 
 * This service simulates BLE functionality when native modules aren't available.
 * Useful for UI/UX testing in Expo Go without needing a development build.
 */

import { BLEDevice, SetupStatus } from '../types';

// Mock Device type (simplified version without native dependencies)
interface MockDevice {
  id: string;
  name: string;
}

class MockBLEService {
  private mockDevices: BLEDevice[] = [
    {
      id: 'mock-device-1',
      name: 'NovoFrame-Setup',
      rssi: -50,
    },
    {
      id: 'mock-device-2',
      name: 'NovoFrame-Setup',
      rssi: -70,
    },
  ];

  /**
   * Check if Bluetooth is enabled (always true in mock)
   */
  async isBluetoothEnabled(): Promise<boolean> {
    return true;
  }

  /**
   * Simulate scanning for NovoFrame devices
   */
  async scanForFrames(
    onDeviceFound: (device: BLEDevice) => void,
    timeoutMs: number = 10000
  ): Promise<void> {
    console.log('[MOCK BLE] Starting scan...');
    
    return new Promise((resolve) => {
      // Simulate finding devices after 2 seconds
      setTimeout(() => {
        this.mockDevices.forEach((device) => {
          console.log('[MOCK BLE] Found device:', device.name);
          onDeviceFound(device);
        });
      }, 2000);

      // Resolve after timeout
      setTimeout(() => {
        console.log('[MOCK BLE] Scan complete');
        resolve();
      }, timeoutMs);
    });
  }

  /**
   * Stop scanning (no-op in mock)
   */
  stopScan(): void {
    console.log('[MOCK BLE] Stopped scanning');
  }

  /**
   * Simulate connecting to a frame device
   */
  async connectToFrame(deviceId: string): Promise<MockDevice> {
    console.log('[MOCK BLE] Connecting to device:', deviceId);
    
    // Simulate connection delay
    await this.delay(1000);
    
    return {
      id: deviceId,
      name: 'NovoFrame-Setup',
    };
  }

  /**
   * Simulate monitoring status updates
   */
  async monitorStatus(
    device: MockDevice,
    onStatusUpdate: (status: SetupStatus) => void
  ): Promise<void> {
    console.log('[MOCK BLE] Monitoring status...');
    // Status updates will be triggered by configureFrame
  }

  /**
   * Simulate sending WiFi credentials and encryption key
   */
  async configureFrame(
    device: MockDevice,
    wifiSSID: string,
    wifiPassword: string,
    encryptionKey: string
  ): Promise<void> {
    console.log('[MOCK BLE] Configuring frame...');
    console.log('[MOCK BLE] SSID:', wifiSSID);
    console.log('[MOCK BLE] Password:', '***');
    console.log('[MOCK BLE] Encryption Key:', encryptionKey.substring(0, 16) + '...');
    
    // Simulate the configuration process with status updates
    // This would normally be done via BLE characteristics
  }

  /**
   * Simulate getting MAC address from device
   */
  async getMACAddress(device: MockDevice): Promise<string> {
    // Generate a mock MAC address based on device ID
    const mockMAC = 'AA:BB:CC:DD:EE:FF';
    console.log('[MOCK BLE] MAC Address:', mockMAC);
    return mockMAC;
  }

  /**
   * Simulate disconnecting from device
   */
  async disconnect(device: MockDevice): Promise<void> {
    console.log('[MOCK BLE] Disconnected from device');
    await this.delay(500);
  }

  /**
   * Cleanup (no-op in mock)
   */
  destroy(): void {
    console.log('[MOCK BLE] Service destroyed');
  }

  /**
   * Simulate waiting for a specific status
   */
  async waitForStatus(
    device: MockDevice,
    expectedStatus: SetupStatus,
    timeoutMs: number = 30000,
    onStatusUpdate?: (status: SetupStatus) => void
  ): Promise<void> {
    console.log('[MOCK BLE] Waiting for status:', expectedStatus);

    // Simulate the setup process with realistic timing
    const statuses: SetupStatus[] = [
      'connecting',
      'ssid_received',
      'password_received',
      'key_received',
      'credentials_saved',
      'connecting_wifi',
      'wifi_connected',
    ];

    for (const status of statuses) {
      await this.delay(800);
      
      if (onStatusUpdate) {
        onStatusUpdate(status);
      }
      
      console.log('[MOCK BLE] Status update:', status);
      
      if (status === expectedStatus) {
        return;
      }
    }
  }

  /**
   * Helper: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const bleService = new MockBLEService();
export const isBLEAvailable = false;

