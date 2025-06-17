import * as SecureStore from 'expo-secure-store';
import api from './api';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

class AuthService {
  async login(email: string, password: string, userType: 'family' | 'planter') {
    try {
      const response = await api.login(email, password, userType);
      
      if (response.token) {
        await SecureStore.setItemAsync(TOKEN_KEY, response.token);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user));
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  async logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    api.setToken(null);
  }

  async getToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  }

  async getUser() {
    const userJson = await SecureStore.getItemAsync(USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  async isLoggedIn(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }

  async initializeAuth() {
    const token = await this.getToken();
    if (token) {
      api.setToken(token);
    }
  }
}

export default new AuthService();