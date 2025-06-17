// API Configuration for PYEBWA Token Mobile App

import { Platform } from 'react-native';

// Determine API URL based on environment
const getApiUrl = () => {
  if (__DEV__) {
    // Development mode
    if (Platform.OS === 'android') {
      // Android emulator
      return 'http://10.0.2.2:5000/api';
    } else if (Platform.OS === 'ios') {
      // iOS simulator
      return 'http://localhost:5000/api';
    } else {
      // Physical device - replace with your computer's IP
      // Find your IP: ifconfig (Mac/Linux) or ipconfig (Windows)
      return 'http://82.197.94.47:5000/api'; // Change this to your IP
    }
  } else {
    // Production
    return 'https://api.pyebwa.com/api';
  }
};

export const API_CONFIG = {
  BASE_URL: getApiUrl(),
  TIMEOUT: 30000,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

// API Endpoints
export const ENDPOINTS = {
  // Health
  HEALTH: '/health',
  
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  REFRESH: '/auth/refresh',
  LOGOUT: '/auth/logout',
  
  // Family Users
  PURCHASE_TOKENS: '/family/tokens/purchase',
  UPLOAD_HERITAGE: '/family/heritage/upload',
  GET_HERITAGE: '/family/heritage',
  GET_IMPACT: '/family/impact',
  GET_TRANSACTIONS: '/family/transactions',
  
  // Planters
  SUBMIT_PLANTING: '/planter/submit',
  GET_EARNINGS: '/planter/earnings',
  GET_SUBMISSIONS: '/planter/submissions',
  WITHDRAW_EARNINGS: '/planter/withdraw',
  
  // Verification
  GET_PENDING_VERIFICATIONS: '/verify/pending',
  SUBMIT_VERIFICATION: '/verify/submit',
  
  // Common
  GET_PROFILE: '/user/profile',
  UPDATE_PROFILE: '/user/profile',
  GET_NOTIFICATIONS: '/user/notifications',
};

// Helper function to build full URL
export const buildUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper to get auth headers
export const getAuthHeaders = (token?: string) => {
  if (token) {
    return {
      ...API_CONFIG.HEADERS,
      'Authorization': `Bearer ${token}`,
    };
  }
  return API_CONFIG.HEADERS;
};