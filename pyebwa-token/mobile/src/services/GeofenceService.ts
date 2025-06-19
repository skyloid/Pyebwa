/**
 * Geofencing Service for PYEBWA Token App
 * Manages geofence regions and monitors location for tree planting validation
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  validateGPSCoordinates, 
  getLocationValidationDetails,
  getPlantingZones,
  getHaitiBoundary 
} from '../utils/gpsValidator';

const LOCATION_TASK_NAME = 'pyebwa-location-tracking';
const GEOFENCE_STORAGE_KEY = 'pyebwa_geofence_data';

interface GeofenceRegion {
  id: string;
  name: string;
  type: 'polygon' | 'circle';
  coordinates: Array<{ latitude: number; longitude: number }>;
  radius?: number; // For circular regions
  isActive: boolean;
  metadata?: {
    plantingDensity?: number;
    lastUpdated?: Date;
    restrictions?: string[];
  };
}

interface GeofenceEvent {
  type: 'enter' | 'exit' | 'dwell';
  regionId: string;
  location: Location.LocationObject;
  timestamp: Date;
}

interface GeofenceState {
  currentRegions: string[];
  lastLocation?: Location.LocationObject;
  events: GeofenceEvent[];
}

class GeofenceService {
  private regions: Map<string, GeofenceRegion> = new Map();
  private state: GeofenceState = {
    currentRegions: [],
    events: []
  };
  private listeners: Map<string, (event: GeofenceEvent) => void> = new Map();
  private isMonitoring: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the geofence service
   */
  private async initialize() {
    // Load saved regions
    await this.loadRegions();

    // Initialize default regions if none exist
    if (this.regions.size === 0) {
      await this.initializeDefaultRegions();
    }

    // Define background location task
    TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
      if (error) {
        console.error('Location tracking error:', error);
        return;
      }

      if (data) {
        const { locations } = data as any;
        const location = locations[0];
        if (location) {
          await this.processLocationUpdate(location);
        }
      }
    });
  }

  /**
   * Initialize default geofence regions
   */
  private async initializeDefaultRegions() {
    // Add Haiti boundary as a region
    const haitiBoundary = getHaitiBoundary();
    this.addRegion({
      id: 'haiti_boundary',
      name: 'Haiti National Boundary',
      type: 'polygon',
      coordinates: haitiBoundary.points,
      isActive: true,
      metadata: {
        lastUpdated: new Date()
      }
    });

    // Add planting zones
    const plantingZones = getPlantingZones();
    plantingZones.forEach((zone, index) => {
      this.addRegion({
        id: `planting_zone_${index}`,
        name: zone.name || `Planting Zone ${index + 1}`,
        type: 'polygon',
        coordinates: zone.points,
        isActive: true,
        metadata: {
          plantingDensity: 0,
          lastUpdated: new Date()
        }
      });
    });

    await this.saveRegions();
  }

  /**
   * Start monitoring location for geofences
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('Geofence monitoring already active');
      return;
    }

    try {
      // Request permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        throw new Error('Location permission not granted');
      }

      // Request background permission for continuous monitoring
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus === 'granted') {
        // Start background location updates
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // 10 seconds
          distanceInterval: 10, // 10 meters
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'PYEBWA Tree Planting',
            notificationBody: 'Monitoring your location for valid planting zones',
            notificationColor: '#00217D',
          },
        });
      } else {
        // Fall back to foreground-only monitoring
        this.startForegroundMonitoring();
      }

      this.isMonitoring = true;
      console.log('Geofence monitoring started');
    } catch (error) {
      console.error('Failed to start geofence monitoring:', error);
      throw error;
    }
  }

  /**
   * Start foreground-only monitoring
   */
  private async startForegroundMonitoring() {
    const locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 5,
      },
      (location) => {
        this.processLocationUpdate(location);
      }
    );

    // Store subscription for cleanup
    (this as any).locationSubscription = locationSubscription;
  }

  /**
   * Stop monitoring location
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    try {
      // Stop background updates
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);

      // Stop foreground subscription if exists
      if ((this as any).locationSubscription) {
        (this as any).locationSubscription.remove();
      }

      this.isMonitoring = false;
      console.log('Geofence monitoring stopped');
    } catch (error) {
      console.error('Failed to stop geofence monitoring:', error);
    }
  }

  /**
   * Process location update
   */
  private async processLocationUpdate(location: Location.LocationObject) {
    const previousRegions = [...this.state.currentRegions];
    const currentRegions: string[] = [];

    // Check each active region
    for (const [regionId, region] of this.regions) {
      if (!region.isActive) continue;

      const isInside = await this.isLocationInRegion(location, region);
      if (isInside) {
        currentRegions.push(regionId);
      }
    }

    // Detect enter events
    for (const regionId of currentRegions) {
      if (!previousRegions.includes(regionId)) {
        this.emitEvent({
          type: 'enter',
          regionId,
          location,
          timestamp: new Date()
        });
      }
    }

    // Detect exit events
    for (const regionId of previousRegions) {
      if (!currentRegions.includes(regionId)) {
        this.emitEvent({
          type: 'exit',
          regionId,
          location,
          timestamp: new Date()
        });
      }
    }

    // Update state
    this.state = {
      currentRegions,
      lastLocation: location,
      events: [...this.state.events].slice(-100) // Keep last 100 events
    };

    await this.saveState();
  }

  /**
   * Check if location is inside a region
   */
  private async isLocationInRegion(
    location: Location.LocationObject, 
    region: GeofenceRegion
  ): Promise<boolean> {
    if (region.type === 'polygon') {
      // Use the GPS validator for polygon regions
      const point = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      
      // Check if point is in polygon
      let inside = false;
      const points = region.coordinates;
      
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i].longitude;
        const yi = points[i].latitude;
        const xj = points[j].longitude;
        const yj = points[j].latitude;

        const intersect = ((yi > point.latitude) !== (yj > point.latitude))
          && (point.longitude < (xj - xi) * (point.latitude - yi) / (yj - yi) + xi);
        
        if (intersect) inside = !inside;
      }
      
      return inside;
    } else if (region.type === 'circle' && region.radius) {
      // For circular regions
      const center = region.coordinates[0];
      const distance = this.calculateDistance(
        location.coords.latitude,
        location.coords.longitude,
        center.latitude,
        center.longitude
      );
      return distance <= region.radius;
    }

    return false;
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Emit geofence event
   */
  private emitEvent(event: GeofenceEvent) {
    this.state.events.push(event);
    
    // Notify all listeners
    for (const listener of this.listeners.values()) {
      listener(event);
    }

    // Log event
    console.log(`Geofence ${event.type}: ${event.regionId} at ${event.timestamp}`);
  }

  /**
   * Add event listener
   */
  addEventListener(id: string, callback: (event: GeofenceEvent) => void) {
    this.listeners.set(id, callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(id: string) {
    this.listeners.delete(id);
  }

  /**
   * Add a new geofence region
   */
  addRegion(region: GeofenceRegion) {
    this.regions.set(region.id, region);
  }

  /**
   * Remove a geofence region
   */
  removeRegion(regionId: string) {
    this.regions.delete(regionId);
  }

  /**
   * Get all regions
   */
  getRegions(): GeofenceRegion[] {
    return Array.from(this.regions.values());
  }

  /**
   * Get current state
   */
  getState(): GeofenceState {
    return this.state;
  }

  /**
   * Check if currently in any planting zone
   */
  isInPlantingZone(): boolean {
    return this.state.currentRegions.some(id => id.startsWith('planting_zone_'));
  }

  /**
   * Get current location validation details
   */
  getCurrentValidationDetails() {
    if (!this.state.lastLocation) {
      return null;
    }
    return getLocationValidationDetails(this.state.lastLocation.coords);
  }

  /**
   * Save regions to storage
   */
  private async saveRegions() {
    try {
      const data = JSON.stringify(Array.from(this.regions.entries()));
      await AsyncStorage.setItem(GEOFENCE_STORAGE_KEY + '_regions', data);
    } catch (error) {
      console.error('Failed to save regions:', error);
    }
  }

  /**
   * Load regions from storage
   */
  private async loadRegions() {
    try {
      const data = await AsyncStorage.getItem(GEOFENCE_STORAGE_KEY + '_regions');
      if (data) {
        const entries = JSON.parse(data);
        this.regions = new Map(entries);
      }
    } catch (error) {
      console.error('Failed to load regions:', error);
    }
  }

  /**
   * Save state to storage
   */
  private async saveState() {
    try {
      await AsyncStorage.setItem(GEOFENCE_STORAGE_KEY + '_state', JSON.stringify(this.state));
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  /**
   * Load state from storage
   */
  private async loadState() {
    try {
      const data = await AsyncStorage.getItem(GEOFENCE_STORAGE_KEY + '_state');
      if (data) {
        this.state = JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  }
}

// Export singleton instance
export const geofenceService = new GeofenceService();