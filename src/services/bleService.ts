import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import { BLE_SERVICE_UUID, BLE_CHARACTERISTICS } from '../constants';
import { BLEDevice, SetupStatus } from '../types';

class BLEService {
  private manager: BleManager;
  private scanSubscription: any = null;

  constructor() {
    this.manager = new BleManager();
  }

  /**
   * Check if Bluetooth is enabled
   */
  async isBluetoothEnabled(): Promise<boolean> {
    const state = await this.manager.state();
    return state === 'PoweredOn';
  }

  /**
   * Scan for NovoFrame devices
   * @param onDeviceFound Callback when a device is discovered
   * @param timeoutMs Scan duration in milliseconds (default: 10000)
   */
  async scanForFrames(
    onDeviceFound: (device: BLEDevice) => void,
    timeoutMs: number = 10000
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const foundDevices = new Set<string>();

      this.scanSubscription = this.manager.startDeviceScan(
        [BLE_SERVICE_UUID],
        null,
        (error, device) => {
          if (error) {
            console.error('BLE Scan error:', error);
            this.stopScan();
            reject(error);
            return;
          }

          if (device && device.name === 'NovoFrame-Setup' && !foundDevices.has(device.id)) {
            foundDevices.add(device.id);
            onDeviceFound({
              id: device.id,
              name: device.name,
              rssi: device.rssi || -100,
            });
          }
        }
      );

      // Stop scan after timeout
      setTimeout(() => {
        this.stopScan();
        resolve();
      }, timeoutMs);
    });
  }

  /**
   * Stop scanning for devices
   */
  stopScan(): void {
    this.manager.stopDeviceScan();
    this.scanSubscription = null;
  }

  /**
   * Connect to a frame device
   * @param deviceId BLE device ID
   */
  async connectToFrame(deviceId: string): Promise<Device> {
    try {
      const device = await this.manager.connectToDevice(deviceId);
      await device.discoverAllServicesAndCharacteristics();
      return device;
    } catch (error) {
      console.error('Connection error:', error);
      throw new Error('Failed to connect to frame');
    }
  }

  /**
   * Subscribe to status updates from the frame
   * @param device Connected device
   * @param onStatusUpdate Callback for status updates
   */
  async monitorStatus(
    device: Device,
    onStatusUpdate: (status: SetupStatus) => void
  ): Promise<void> {
    try {
      device.monitorCharacteristicForService(
        BLE_SERVICE_UUID,
        BLE_CHARACTERISTICS.STATUS,
        (error, characteristic) => {
          if (error) {
            console.error('Status monitoring error:', error);
            return;
          }

          if (characteristic && characteristic.value) {
            try {
              // Decode base64 value
              const decodedValue = Buffer.from(characteristic.value, 'base64').toString('utf-8');
              const statusData = JSON.parse(decodedValue);
              onStatusUpdate(statusData.status as SetupStatus);
            } catch (parseError) {
              console.error('Error parsing status:', parseError);
            }
          }
        }
      );
    } catch (error) {
      console.error('Error setting up status monitoring:', error);
      throw error;
    }
  }

  /**
   * Send WiFi credentials and encryption key to frame
   * @param device Connected device
   * @param wifiSSID WiFi network name
   * @param wifiPassword WiFi password
   * @param encryptionKey 64-character hex encryption key
   */
  async configureFrame(
    device: Device,
    wifiSSID: string,
    wifiPassword: string,
    encryptionKey: string
  ): Promise<void> {
    try {
      // Send WiFi SSID
      await device.writeCharacteristicWithResponseForService(
        BLE_SERVICE_UUID,
        BLE_CHARACTERISTICS.SSID,
        Buffer.from(wifiSSID).toString('base64')
      );
      console.log('SSID sent');

      // Wait before sending next characteristic
      await this.delay(500);

      // Send WiFi Password
      await device.writeCharacteristicWithResponseForService(
        BLE_SERVICE_UUID,
        BLE_CHARACTERISTICS.PASSWORD,
        Buffer.from(wifiPassword).toString('base64')
      );
      console.log('Password sent');

      await this.delay(500);

      // Send Encryption Key
      await device.writeCharacteristicWithResponseForService(
        BLE_SERVICE_UUID,
        BLE_CHARACTERISTICS.ENCRYPTION_KEY,
        Buffer.from(encryptionKey).toString('base64')
      );
      console.log('Encryption key sent');

      console.log('All data sent successfully!');
    } catch (error) {
      console.error('Configuration error:', error);
      throw new Error('Failed to send configuration data');
    }
  }

  /**
   * Get the MAC address from a connected device
   * @param device Connected device
   */
  async getMACAddress(device: Device): Promise<string> {
    // In React Native BLE PLX, the device ID is often the MAC address
    // For iOS, it's a UUID, but the ESP32 should advertise the MAC in device info
    // We'll need to get it from the device ID or from a custom characteristic
    return device.id;
  }

  /**
   * Disconnect from a device
   * @param device Device to disconnect
   */
  async disconnect(device: Device): Promise<void> {
    try {
      await device.cancelConnection();
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }

  /**
   * Cleanup and destroy the BLE manager
   */
  destroy(): void {
    this.stopScan();
    this.manager.destroy();
  }

  /**
   * Helper: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wait for a specific status with timeout
   * @param device Connected device
   * @param expectedStatus Status to wait for
   * @param timeoutMs Timeout in milliseconds
   * @param onStatusUpdate Optional callback for intermediate status updates
   */
  async waitForStatus(
    device: Device,
    expectedStatus: SetupStatus,
    timeoutMs: number = 30000,
    onStatusUpdate?: (status: SetupStatus) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout waiting for status: ${expectedStatus}`));
      }, timeoutMs);

      this.monitorStatus(device, (status) => {
        if (onStatusUpdate) {
          onStatusUpdate(status);
        }

        if (status === expectedStatus) {
          clearTimeout(timeout);
          resolve();
        } else if (status === 'error' || status === 'wifi_failed') {
          clearTimeout(timeout);
          reject(new Error(`Setup failed with status: ${status}`));
        }
      });
    });
  }
}

export const bleService = new BLEService();

