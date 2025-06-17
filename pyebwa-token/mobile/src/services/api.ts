import { Platform } from 'react-native';

// Using ngrok URL for all platforms
const BASE_URL = 'https://b0aa-2a02-4780-10-4eaa-00-1.ngrok-free.app/api';

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${BASE_URL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Health check
  async health() {
    return this.request('/health');
  }

  // Auth endpoints
  async login(email: string, password: string, userType: 'family' | 'planter') {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, userType }),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async logout() {
    this.setToken(null);
  }

  // Planter endpoints
  async submitPlanting(data: {
    treeCount: number;
    location: { latitude: number; longitude: number };
    photos: string[];
  }) {
    return this.request('/planter/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getEarnings() {
    return this.request('/planter/earnings');
  }

  async getSubmissions() {
    return this.request('/planter/submissions');
  }

  // Family endpoints
  async purchaseTokens(amount: number) {
    return this.request('/family/tokens/purchase', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async getImpact() {
    return this.request('/family/impact');
  }

  async uploadHeritage(data: {
    title: string;
    description: string;
    type: 'photo' | 'story' | 'video';
    content: string;
  }) {
    return this.request('/family/heritage/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export default new ApiService();