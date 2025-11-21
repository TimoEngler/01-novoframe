/**
 * BLE Service Proxy
 * 
 * Automatically detects if native BLE is available and uses the appropriate service:
 * - Real BLE service in development builds
 * - Mock BLE service in Expo Go
 */

let bleService: any;
let isBLEAvailable: boolean;

try {
  // Try to import the real BLE service
  const realBLE = require('./bleService');
  bleService = realBLE.bleService;
  isBLEAvailable = true;
  console.log('[BLE Proxy] Using REAL BLE service');
} catch (error) {
  // If it fails (Expo Go), use mock service
  const mockBLE = require('./bleService.mock');
  bleService = mockBLE.bleService;
  isBLEAvailable = false;
  console.log('[BLE Proxy] Using MOCK BLE service (Expo Go detected)');
}

export { bleService, isBLEAvailable };

