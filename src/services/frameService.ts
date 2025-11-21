import { apiClient } from '../utils/api';
import { API_BASE_URL } from '../constants';
import { Frame } from '../types';

export interface PairFrameRequest {
  mac_address: string;
  name: string;
}

export interface UpdateFrameNameRequest {
  name: string;
}

class FrameService {
  /**
   * Get all frames for the authenticated user
   */
  async getFrames(): Promise<Frame[]> {
    try {
      const response = await apiClient.get<{ frames: Frame[] }>(
        `${API_BASE_URL}/api/frames`
      );
      return response.data.frames;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to fetch frames';
      throw new Error(errorMessage);
    }
  }

  /**
   * Pair a frame with the user's account
   * @param macAddress Frame's MAC address
   * @param name Display name for the frame
   */
  async pairFrame(macAddress: string, name: string): Promise<Frame> {
    try {
      const response = await apiClient.post<{ frame: Frame }>(
        `${API_BASE_URL}/api/frames/pair`,
        {
          mac_address: macAddress,
          name: name,
        }
      );
      return response.data.frame;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to pair frame';
      throw new Error(errorMessage);
    }
  }

  /**
   * Update a frame's name
   * @param macAddress Frame's MAC address
   * @param name New display name
   */
  async updateFrameName(macAddress: string, name: string): Promise<Frame> {
    try {
      const response = await apiClient.put<{ frame: Frame }>(
        `${API_BASE_URL}/api/frames/${macAddress}`,
        {
          name: name,
        }
      );
      return response.data.frame;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to update frame name';
      throw new Error(errorMessage);
    }
  }

  /**
   * Delete a frame from the user's account
   * @param macAddress Frame's MAC address
   */
  async deleteFrame(macAddress: string): Promise<void> {
    try {
      await apiClient.delete(`${API_BASE_URL}/api/frames/${macAddress}`);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to delete frame';
      throw new Error(errorMessage);
    }
  }
}

export const frameService = new FrameService();

