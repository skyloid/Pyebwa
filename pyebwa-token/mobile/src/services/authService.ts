import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserType } from '../types';

export interface AuthUser {
  uid: string;
  email: string;
  displayName?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  userType: UserType;
  phoneNumber?: string;
  organization?: string;
  createdAt: Date;
  lastLogin: Date;
}

interface StoredAuthState {
  user: AuthUser | null;
  profile: UserProfile | null;
}

const STORAGE_KEYS = {
  AUTH_STATE: 'pyebwa_token_auth_state',
  USER_PROFILES: 'pyebwa_token_user_profiles',
  USER_TYPE: 'userType',
  USER_EMAIL: 'userEmail',
  USER_NAME: 'userName',
  IS_LOGGED_IN: 'isLoggedIn',
};

class AuthService {
  private currentUser: AuthUser | null = null;
  private userProfile: UserProfile | null = null;
  private initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const authState = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_STATE);
    if (authState) {
      const parsed = JSON.parse(authState) as StoredAuthState;
      this.currentUser = parsed.user;
      this.userProfile = parsed.profile
        ? {
            ...parsed.profile,
            createdAt: new Date(parsed.profile.createdAt),
            lastLogin: new Date(parsed.profile.lastLogin),
          }
        : null;
    }
    this.initialized = true;
  }

  private async loadProfiles(): Promise<Record<string, UserProfile>> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILES);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, UserProfile>;
    return Object.fromEntries(
      Object.entries(parsed).map(([key, profile]) => [
        key,
        {
          ...profile,
          createdAt: new Date(profile.createdAt),
          lastLogin: new Date(profile.lastLogin),
        },
      ])
    );
  }

  private async saveProfiles(profiles: Record<string, UserProfile>): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILES, JSON.stringify(profiles));
  }

  private async persistCurrentState(): Promise<void> {
    await AsyncStorage.setItem(
      STORAGE_KEYS.AUTH_STATE,
      JSON.stringify({
        user: this.currentUser,
        profile: this.userProfile,
      } satisfies StoredAuthState)
    );

    if (this.userProfile) {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.USER_TYPE, this.userProfile.userType],
        [STORAGE_KEYS.USER_EMAIL, this.userProfile.email],
        [STORAGE_KEYS.USER_NAME, this.userProfile.name],
        [STORAGE_KEYS.IS_LOGGED_IN, 'true'],
      ]);
    } else {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.USER_TYPE,
        STORAGE_KEYS.USER_EMAIL,
        STORAGE_KEYS.USER_NAME,
        STORAGE_KEYS.IS_LOGGED_IN,
      ]);
    }
  }

  private buildAuthUser(profile: UserProfile): AuthUser {
    return {
      uid: profile.uid,
      email: profile.email,
      displayName: profile.name,
    };
  }

  async initializeAuth(): Promise<AuthUser | null> {
    await this.ensureInitialized();
    return this.currentUser;
  }

  async register(
    email: string,
    password: string,
    name: string,
    userType: UserType,
    additionalInfo?: { phoneNumber?: string; organization?: string }
  ): Promise<UserProfile> {
    await this.ensureInitialized();

    if (!password || password.length < 6) {
      throw new Error('Password should be at least 6 characters long.');
    }

    const profiles = await this.loadProfiles();
    const existingProfile = Object.values(profiles).find(
      (profile) => profile.email.toLowerCase() === email.toLowerCase()
    );

    if (existingProfile) {
      throw new Error('This email is already registered. Please use a different email or try logging in.');
    }

    const now = new Date();
    const profile: UserProfile = {
      uid: `user_${Date.now()}`,
      email,
      name,
      userType,
      phoneNumber: additionalInfo?.phoneNumber,
      organization: additionalInfo?.organization,
      createdAt: now,
      lastLogin: now,
    };

    profiles[profile.uid] = profile;
    await this.saveProfiles(profiles);

    this.currentUser = this.buildAuthUser(profile);
    this.userProfile = profile;
    await this.persistCurrentState();

    return profile;
  }

  async login(email: string, password: string): Promise<UserProfile> {
    await this.ensureInitialized();

    if (!password) {
      throw new Error('Please enter your password.');
    }

    const profiles = await this.loadProfiles();
    const profile = Object.values(profiles).find(
      (candidate) => candidate.email.toLowerCase() === email.toLowerCase()
    );

    if (!profile) {
      throw new Error('No account found with this email. Please check your email or create a new account.');
    }

    profile.lastLogin = new Date();
    profiles[profile.uid] = profile;
    await this.saveProfiles(profiles);

    this.currentUser = this.buildAuthUser(profile);
    this.userProfile = profile;
    await this.persistCurrentState();

    return profile;
  }

  async demoLogin(userType: UserType): Promise<UserProfile> {
    const demoProfiles: Record<UserType, { email: string; password: string; name: string; organization?: string }> = {
      family: {
        email: 'family@demo.com',
        password: 'demo123',
        name: 'Demo Family Member',
      },
      planter: {
        email: 'planter@demo.com',
        password: 'demo123',
        name: 'Demo Tree Planter',
      },
      validator: {
        email: 'validator@demo.com',
        password: 'demo123',
        name: 'Demo Validator',
        organization: 'PYEBWA Demo Org',
      },
    };

    const demoProfile = demoProfiles[userType];

    try {
      return await this.login(demoProfile.email, demoProfile.password);
    } catch {
      return await this.register(
        demoProfile.email,
        demoProfile.password,
        demoProfile.name,
        userType,
        { organization: demoProfile.organization }
      );
    }
  }

  async logout(): Promise<void> {
    await this.ensureInitialized();
    this.currentUser = null;
    this.userProfile = null;
    await this.persistCurrentState();
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  getUserProfile(): UserProfile | null {
    return this.userProfile;
  }

  isLoggedIn(): boolean {
    return this.currentUser !== null;
  }

  async getUserType(): Promise<UserType | null> {
    await this.ensureInitialized();
    return this.userProfile?.userType || null;
  }

  isValidator(): boolean {
    return this.userProfile?.userType === 'validator';
  }

  isPlanter(): boolean {
    return this.userProfile?.userType === 'planter';
  }
}

export default new AuthService();
