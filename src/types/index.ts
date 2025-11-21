// Type definitions
export interface User {
  id: number;
  username: string;
  email: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Frame {
  id: number;
  mac_address: string;
  name: string;
  paired: boolean;
  has_image: boolean;
  last_image_upload?: string;
  created_at: string;
  paired_at?: string;
}

export interface BLEDevice {
  id: string;
  name: string;
  rssi: number;
}

export type SetupStatus =
  | 'idle'
  | 'scanning'
  | 'found'
  | 'connecting'
  | 'ssid_received'
  | 'password_received'
  | 'key_received'
  | 'credentials_saved'
  | 'connecting_wifi'
  | 'wifi_connected'
  | 'wifi_failed'
  | 'complete'
  | 'error';

// Navigation types
export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  Profile: undefined;
  FrameSetup: undefined;
  NameFrame: { macAddress: string; encryptionKey: string };
};
