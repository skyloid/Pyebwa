/**
 * Device utilities for PYEBWA Token App
 */

import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'pyebwa_device_id';

/**
 * Get or generate a unique device ID
 */
export async function getDeviceId(): Promise<string> {
  try {
    // Try to get existing device ID from storage
    const storedId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (storedId) {
      return storedId;
    }

    // Generate new device ID
    let deviceId: string;
    
    if (Device.osName === 'iOS' || Device.osName === 'iPadOS') {
      // Use identifierForVendor on iOS
      deviceId = Device.deviceName ? 
        `ios_${Device.deviceName}_${Date.now()}` : 
        `ios_${Date.now()}`;
    } else if (Device.osName === 'Android') {
      // Use Android ID if available
      deviceId = Device.deviceName ? 
        `android_${Device.deviceName}_${Date.now()}` : 
        `android_${Date.now()}`;
    } else {
      // Fallback for web or unknown platforms
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Store the generated ID
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    
    return deviceId;
  } catch (error) {
    console.error('Error getting device ID:', error);
    // Return a temporary ID if storage fails
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Get device information
 */
export function getDeviceInfo() {
  return {
    brand: Device.brand,
    manufacturer: Device.manufacturer,
    modelName: Device.modelName,
    osName: Device.osName,
    osVersion: Device.osVersion,
    deviceType: Device.deviceType,
    isDevice: Device.isDevice,
  };
}