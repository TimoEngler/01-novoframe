// Global type definitions for the app

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Navigation types
export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  // Add more screens as needed
};

