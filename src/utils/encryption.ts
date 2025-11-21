import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { STORAGE_KEYS } from '../constants';

/**
 * Generate a cryptographically secure 256-bit AES encryption key
 * @returns 64-character hex string representing the key
 */
export async function generateEncryptionKey(): Promise<string> {
  // Generate 32 random bytes (256 bits)
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  
  // Convert to hex string (64 characters)
  const hexKey = Array.from(randomBytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
  
  return hexKey;
}

/**
 * Save encryption key securely for a specific frame
 * @param macAddress Frame's MAC address (used as identifier)
 * @param key 64-character hex string encryption key
 */
export async function saveEncryptionKey(
  macAddress: string,
  key: string
): Promise<void> {
  const storageKey = `${STORAGE_KEYS.ENCRYPTION_KEY_PREFIX}${macAddress}`;
  await SecureStore.setItemAsync(storageKey, key);
}

/**
 * Retrieve encryption key for a specific frame
 * @param macAddress Frame's MAC address
 * @returns Encryption key or null if not found
 */
export async function getEncryptionKey(
  macAddress: string
): Promise<string | null> {
  try {
    const storageKey = `${STORAGE_KEYS.ENCRYPTION_KEY_PREFIX}${macAddress}`;
    return await SecureStore.getItemAsync(storageKey);
  } catch (error) {
    console.error('Error retrieving encryption key:', error);
    return null;
  }
}

/**
 * Delete encryption key for a specific frame
 * @param macAddress Frame's MAC address
 */
export async function deleteEncryptionKey(
  macAddress: string
): Promise<void> {
  try {
    const storageKey = `${STORAGE_KEYS.ENCRYPTION_KEY_PREFIX}${macAddress}`;
    await SecureStore.deleteItemAsync(storageKey);
  } catch (error) {
    console.error('Error deleting encryption key:', error);
  }
}

