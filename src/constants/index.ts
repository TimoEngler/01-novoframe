// App constants
export { colors, spacing, borderRadius, typography, shadows } from './theme';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.novoframe.de';

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
} as const;

