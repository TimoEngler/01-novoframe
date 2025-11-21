// App constants
export { colors, spacing, borderRadius, typography, shadows } from './theme';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.novoframe.de';

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  ENCRYPTION_KEY_PREFIX: 'frame_encryption_key_',
} as const;

// BLE Configuration
export const BLE_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';

export const BLE_CHARACTERISTICS = {
  SSID: 'beb5483e-36e1-4688-b7f5-ea07361b26a8',
  PASSWORD: 'beb5483e-36e1-4688-b7f5-ea07361b26a9',
  ENCRYPTION_KEY: 'beb5483e-36e1-4688-b7f5-ea07361b26aa',
  STATUS: 'beb5483e-36e1-4688-b7f5-ea07361b26ab',
} as const;

