/**
 * GPS Validation Utilities for PYEBWA Token App
 * Validates GPS coordinates for tree planting in Haiti
 */

import { LocationObjectCoords } from 'expo-location';

/**
 * Point interface for geographic coordinates
 */
interface Point {
  latitude: number;
  longitude: number;
}

/**
 * Polygon interface for defining geographic boundaries
 */
interface Polygon {
  points: Point[];
  name?: string;
}

/**
 * Haiti's approximate boundary polygon
 * More accurate than simple rectangle bounds
 */
const HAITI_BOUNDARY: Polygon = {
  name: 'Haiti',
  points: [
    { latitude: 20.0877, longitude: -71.6217 }, // Cap-Haïtien area (North)
    { latitude: 19.9319, longitude: -71.6528 },
    { latitude: 19.8411, longitude: -71.7078 },
    { latitude: 19.6744, longitude: -71.7572 },
    { latitude: 19.4883, longitude: -71.8539 },
    { latitude: 19.1053, longitude: -71.6522 }, // Northeast
    { latitude: 18.6300, longitude: -71.9833 },
    { latitude: 18.4847, longitude: -72.3422 },
    { latitude: 18.2208, longitude: -72.5317 },
    { latitude: 18.0311, longitude: -72.7044 }, // Southeast
    { latitude: 18.0211, longitude: -73.4539 },
    { latitude: 18.1944, longitude: -73.8817 },
    { latitude: 18.2561, longitude: -74.0989 },
    { latitude: 18.3750, longitude: -74.4517 }, // Southwest
    { latitude: 18.6428, longitude: -74.4678 },
    { latitude: 19.1067, longitude: -73.3972 },
    { latitude: 19.7167, longitude: -72.8583 },
    { latitude: 19.9333, longitude: -72.2917 },
    { latitude: 20.0877, longitude: -71.6217 }, // Close polygon
  ]
};

/**
 * Designated planting zones within Haiti
 * These are example zones - should be updated with actual designated areas
 */
const PLANTING_ZONES: Polygon[] = [
  {
    name: 'Central Plateau',
    points: [
      { latitude: 19.1500, longitude: -72.0167 },
      { latitude: 19.0333, longitude: -71.9333 },
      { latitude: 18.9167, longitude: -72.0500 },
      { latitude: 19.0333, longitude: -72.1333 },
      { latitude: 19.1500, longitude: -72.0167 },
    ]
  },
  {
    name: 'Artibonite Valley',
    points: [
      { latitude: 19.4500, longitude: -72.6833 },
      { latitude: 19.2667, longitude: -72.5167 },
      { latitude: 19.1000, longitude: -72.6333 },
      { latitude: 19.2833, longitude: -72.8000 },
      { latitude: 19.4500, longitude: -72.6833 },
    ]
  }
];

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
function isPointInPolygon(point: Point, polygon: Polygon): boolean {
  const { points } = polygon;
  let inside = false;

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
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(point1: Point, point2: Point): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = point1.latitude * Math.PI / 180;
  const φ2 = point2.latitude * Math.PI / 180;
  const Δφ = (point2.latitude - point1.latitude) * Math.PI / 180;
  const Δλ = (point2.longitude - point1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Find the nearest point on a polygon boundary to a given point
 */
function nearestPointOnPolygon(point: Point, polygon: Polygon): { point: Point; distance: number } {
  let minDistance = Infinity;
  let nearestPoint: Point = polygon.points[0];

  // Check distance to each edge of the polygon
  for (let i = 0; i < polygon.points.length; i++) {
    const j = (i + 1) % polygon.points.length;
    const edgeStart = polygon.points[i];
    const edgeEnd = polygon.points[j];

    // Find nearest point on this edge
    const nearestOnEdge = nearestPointOnLineSegment(point, edgeStart, edgeEnd);
    const distance = calculateDistance(point, nearestOnEdge);

    if (distance < minDistance) {
      minDistance = distance;
      nearestPoint = nearestOnEdge;
    }
  }

  return { point: nearestPoint, distance: minDistance };
}

/**
 * Find the nearest point on a line segment to a given point
 */
function nearestPointOnLineSegment(point: Point, lineStart: Point, lineEnd: Point): Point {
  const dx = lineEnd.longitude - lineStart.longitude;
  const dy = lineEnd.latitude - lineStart.latitude;

  if (dx === 0 && dy === 0) {
    return lineStart;
  }

  const t = Math.max(0, Math.min(1, 
    ((point.longitude - lineStart.longitude) * dx + 
     (point.latitude - lineStart.latitude) * dy) / 
    (dx * dx + dy * dy)
  ));

  return {
    latitude: lineStart.latitude + t * dy,
    longitude: lineStart.longitude + t * dx
  };
}

/**
 * Main validation function for GPS coordinates
 */
export async function validateGPSCoordinates(
  latitude: number, 
  longitude: number,
  options?: {
    requirePlantingZone?: boolean;
    minAccuracy?: number;
  }
): Promise<boolean> {
  const point: Point = { latitude, longitude };

  // First check if point is within Haiti
  if (!isPointInPolygon(point, HAITI_BOUNDARY)) {
    return false;
  }

  // If requiring specific planting zone
  if (options?.requirePlantingZone) {
    return PLANTING_ZONES.some(zone => isPointInPolygon(point, zone));
  }

  return true;
}

/**
 * Get detailed validation information
 */
export function getLocationValidationDetails(coords: LocationObjectCoords): {
  isValid: boolean;
  isInHaiti: boolean;
  isInPlantingZone: boolean;
  nearestPlantingZone?: string;
  distanceToNearestZone?: number;
  accuracy: number;
} {
  const point: Point = { 
    latitude: coords.latitude, 
    longitude: coords.longitude 
  };

  const isInHaiti = isPointInPolygon(point, HAITI_BOUNDARY);
  
  let isInPlantingZone = false;
  let nearestPlantingZone: string | undefined;
  let distanceToNearestZone = Infinity;

  // Check planting zones
  for (const zone of PLANTING_ZONES) {
    if (isPointInPolygon(point, zone)) {
      isInPlantingZone = true;
      nearestPlantingZone = zone.name;
      distanceToNearestZone = 0;
      break;
    } else if (zone.name) {
      const { distance } = nearestPointOnPolygon(point, zone);
      if (distance < distanceToNearestZone) {
        distanceToNearestZone = distance;
        nearestPlantingZone = zone.name;
      }
    }
  }

  return {
    isValid: isInHaiti,
    isInHaiti,
    isInPlantingZone,
    nearestPlantingZone,
    distanceToNearestZone: distanceToNearestZone === Infinity ? undefined : distanceToNearestZone,
    accuracy: coords.accuracy || 0,
  };
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  } else {
    return `${(meters / 1000).toFixed(1)}km`;
  }
}

/**
 * Check if GPS accuracy is acceptable
 */
export function isAccuracyAcceptable(accuracy: number | null, threshold: number = 50): boolean {
  return accuracy !== null && accuracy <= threshold;
}

/**
 * Get all planting zones
 */
export function getPlantingZones(): Polygon[] {
  return PLANTING_ZONES;
}

/**
 * Get Haiti boundary
 */
export function getHaitiBoundary(): Polygon {
  return HAITI_BOUNDARY;
}