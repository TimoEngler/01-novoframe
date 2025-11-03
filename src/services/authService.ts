// Authentication service
// This will be implemented once API documentation is provided
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants';
import { User } from '../types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

class AuthService {
  // Store auth token securely
  async storeToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token);
  }

  // Get stored auth token
  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  // Remove auth token
  async removeToken(): Promise<void> {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
  }

  // Store user data
  async storeUserData(user: User): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  }

  // Get stored user data
  async getUserData(): Promise<User | null> {
    try {
      const userData = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  // Remove user data
  async removeUserData(): Promise<void> {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
  }

  // Login function - to be implemented with API
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // TODO: Implement login API call once documentation is provided
    throw new Error('Login not yet implemented - awaiting API documentation');
  }

  // Logout function
  async logout(): Promise<void> {
    await this.removeToken();
    await this.removeUserData();
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }
}

export const authService = new AuthService();

