import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MobileUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  familyTreeId: string;
  createdAt: string;
  updatedAt: string;
  photoURL?: string;
  phoneNumber?: string;
  birthDate?: string;
  location?: string;
}

interface StoredAuthState {
  user: MobileUser | null;
  profile: UserProfile | null;
}

const STORAGE_KEYS = {
  AUTH_STATE: 'pyebwa_mobile_auth_state',
  USER_PROFILES: 'pyebwa_mobile_user_profiles',
};

type AuthListener = (user: MobileUser | null) => void;

class AuthServiceClass {
  private currentUser: MobileUser | null = null;
  private currentProfile: UserProfile | null = null;
  private listeners = new Set<AuthListener>();
  private initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }
    const authState = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_STATE);
    if (authState) {
      const parsed = JSON.parse(authState) as StoredAuthState;
      this.currentUser = parsed.user;
      this.currentProfile = parsed.profile;
    }
    this.initialized = true;
  }

  private async loadProfiles(): Promise<Record<string, UserProfile>> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILES);
    return raw ? JSON.parse(raw) : {};
  }

  private async saveProfiles(profiles: Record<string, UserProfile>): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILES, JSON.stringify(profiles));
  }

  private async persistAuthState(): Promise<void> {
    await AsyncStorage.setItem(
      STORAGE_KEYS.AUTH_STATE,
      JSON.stringify({
        user: this.currentUser,
        profile: this.currentProfile,
      } satisfies StoredAuthState)
    );
  }

  private emitAuthState(): void {
    this.listeners.forEach((listener) => listener(this.currentUser));
  }

  private buildUserFromProfile(profile: UserProfile): MobileUser {
    return {
      uid: profile.uid,
      email: profile.email,
      displayName: profile.displayName,
      photoURL: profile.photoURL,
      phoneNumber: profile.phoneNumber,
    };
  }

  async signIn(email: string, password: string): Promise<{ user: MobileUser }> {
    await this.ensureInitialized();

    if (!password) {
      throw new Error('Password is required');
    }

    const profiles = await this.loadProfiles();
    const profile = Object.values(profiles).find(
      (candidate) => candidate.email.toLowerCase() === email.toLowerCase()
    );

    if (!profile) {
      throw new Error('No account found with this email address');
    }

    this.currentProfile = profile;
    this.currentUser = this.buildUserFromProfile(profile);
    await this.persistAuthState();
    this.emitAuthState();

    return { user: this.currentUser };
  }

  async signUp(email: string, password: string, displayName: string): Promise<{ user: MobileUser }> {
    await this.ensureInitialized();

    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const profiles = await this.loadProfiles();
    const existingProfile = Object.values(profiles).find(
      (candidate) => candidate.email.toLowerCase() === email.toLowerCase()
    );

    if (existingProfile) {
      throw new Error('An account with this email already exists');
    }

    const uid = `mobile_${Date.now()}`;
    const timestamp = new Date().toISOString();
    const profile: UserProfile = {
      uid,
      email,
      displayName,
      familyTreeId: `tree_${uid}`,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    profiles[uid] = profile;
    await this.saveProfiles(profiles);

    this.currentProfile = profile;
    this.currentUser = this.buildUserFromProfile(profile);
    await this.persistAuthState();
    this.emitAuthState();

    return { user: this.currentUser };
  }

  async signOut(): Promise<void> {
    await this.ensureInitialized();
    this.currentUser = null;
    this.currentProfile = null;
    await this.persistAuthState();
    this.emitAuthState();
  }

  async resetPassword(email: string): Promise<void> {
    await this.ensureInitialized();
    const profiles = await this.loadProfiles();
    const profile = Object.values(profiles).find(
      (candidate) => candidate.email.toLowerCase() === email.toLowerCase()
    );

    if (!profile) {
      throw new Error('No account found with this email address');
    }
  }

  onAuthStateChanged(callback: AuthListener): () => void {
    void this.ensureInitialized().then(() => callback(this.currentUser));
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  getCurrentUser(): MobileUser | null {
    return this.currentUser;
  }

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    await this.ensureInitialized();
    const profiles = await this.loadProfiles();
    return profiles[uid] || null;
  }

  async updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    await this.ensureInitialized();
    const profiles = await this.loadProfiles();
    const existingProfile = profiles[uid];

    if (!existingProfile) {
      throw new Error('User profile not found');
    }

    const updatedProfile: UserProfile = {
      ...existingProfile,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    profiles[uid] = updatedProfile;
    await this.saveProfiles(profiles);

    if (this.currentUser?.uid === uid) {
      this.currentProfile = updatedProfile;
      this.currentUser = this.buildUserFromProfile(updatedProfile);
      await this.persistAuthState();
      this.emitAuthState();
    }
  }

  async getFamilyTreeId(uid: string): Promise<string | null> {
    const profile = await this.getUserProfile(uid);
    return profile?.familyTreeId || null;
  }
}

export const AuthService = new AuthServiceClass();
