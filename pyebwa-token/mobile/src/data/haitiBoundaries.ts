/**
 * Haiti Boundaries and Planting Zones
 * Accurate geographical data for tree planting validation
 */

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface Region {
  id: string;
  name: string;
  type: 'department' | 'commune' | 'planting_zone' | 'restricted';
  coordinates: Coordinate[];
  description?: string;
  plantingInfo?: {
    optimalSpecies: string[];
    density: number; // trees per hectare
    season: string;
  };
}

/**
 * Haiti's 10 departments with their boundaries
 */
export const HAITI_DEPARTMENTS: Region[] = [
  {
    id: 'artibonite',
    name: 'Artibonite',
    type: 'department',
    coordinates: [
      { latitude: 19.4500, longitude: -72.6833 },
      { latitude: 19.2667, longitude: -72.3500 },
      { latitude: 19.0000, longitude: -72.4167 },
      { latitude: 19.0333, longitude: -72.7833 },
      { latitude: 19.3000, longitude: -72.9167 },
      { latitude: 19.4500, longitude: -72.6833 },
    ],
    description: 'Largest department, contains the Artibonite River valley'
  },
  {
    id: 'centre',
    name: 'Centre',
    type: 'department',
    coordinates: [
      { latitude: 19.1500, longitude: -71.8333 },
      { latitude: 18.9333, longitude: -71.7500 },
      { latitude: 18.8333, longitude: -72.1667 },
      { latitude: 19.0000, longitude: -72.3333 },
      { latitude: 19.2167, longitude: -72.1333 },
      { latitude: 19.1500, longitude: -71.8333 },
    ],
    description: 'Central plateau region'
  },
  {
    id: 'grand_anse',
    name: "Grand'Anse",
    type: 'department',
    coordinates: [
      { latitude: 18.6667, longitude: -74.1167 },
      { latitude: 18.4833, longitude: -74.0000 },
      { latitude: 18.3167, longitude: -73.7500 },
      { latitude: 18.5000, longitude: -73.5833 },
      { latitude: 18.7167, longitude: -73.7500 },
      { latitude: 18.6667, longitude: -74.1167 },
    ],
    description: 'Southwestern peninsula'
  },
  {
    id: 'nippes',
    name: 'Nippes',
    type: 'department',
    coordinates: [
      { latitude: 18.5000, longitude: -73.5833 },
      { latitude: 18.3500, longitude: -73.3833 },
      { latitude: 18.2833, longitude: -73.0833 },
      { latitude: 18.4500, longitude: -73.0000 },
      { latitude: 18.5833, longitude: -73.2500 },
      { latitude: 18.5000, longitude: -73.5833 },
    ],
    description: 'Coastal department on southern peninsula'
  },
  {
    id: 'nord',
    name: 'Nord',
    type: 'department',
    coordinates: [
      { latitude: 19.9500, longitude: -72.2000 },
      { latitude: 19.7667, longitude: -71.8333 },
      { latitude: 19.5833, longitude: -71.8333 },
      { latitude: 19.5833, longitude: -72.4167 },
      { latitude: 19.8333, longitude: -72.4167 },
      { latitude: 19.9500, longitude: -72.2000 },
    ],
    description: 'Northern department, includes Cap-Haïtien'
  },
  {
    id: 'nord_est',
    name: 'Nord-Est',
    type: 'department',
    coordinates: [
      { latitude: 19.6667, longitude: -71.8333 },
      { latitude: 19.5000, longitude: -71.6667 },
      { latitude: 19.3333, longitude: -71.6667 },
      { latitude: 19.3333, longitude: -71.9167 },
      { latitude: 19.5833, longitude: -72.0000 },
      { latitude: 19.6667, longitude: -71.8333 },
    ],
    description: 'Northeastern department'
  },
  {
    id: 'nord_ouest',
    name: 'Nord-Ouest',
    type: 'department',
    coordinates: [
      { latitude: 20.0833, longitude: -72.8333 },
      { latitude: 19.8333, longitude: -72.4167 },
      { latitude: 19.5833, longitude: -72.6667 },
      { latitude: 19.6667, longitude: -73.0833 },
      { latitude: 19.9500, longitude: -73.0833 },
      { latitude: 20.0833, longitude: -72.8333 },
    ],
    description: 'Northwestern department'
  },
  {
    id: 'ouest',
    name: 'Ouest',
    type: 'department',
    coordinates: [
      { latitude: 18.8333, longitude: -72.3333 },
      { latitude: 18.5500, longitude: -72.0000 },
      { latitude: 18.3333, longitude: -72.3333 },
      { latitude: 18.4167, longitude: -72.8333 },
      { latitude: 18.7500, longitude: -72.7500 },
      { latitude: 18.8333, longitude: -72.3333 },
    ],
    description: 'Includes Port-au-Prince metropolitan area'
  },
  {
    id: 'sud',
    name: 'Sud',
    type: 'department',
    coordinates: [
      { latitude: 18.3333, longitude: -73.7500 },
      { latitude: 18.1667, longitude: -73.5833 },
      { latitude: 18.0333, longitude: -73.3333 },
      { latitude: 18.1667, longitude: -72.9167 },
      { latitude: 18.4167, longitude: -73.2500 },
      { latitude: 18.3333, longitude: -73.7500 },
    ],
    description: 'Southern coastal department'
  },
  {
    id: 'sud_est',
    name: 'Sud-Est',
    type: 'department',
    coordinates: [
      { latitude: 18.3333, longitude: -72.3333 },
      { latitude: 18.1667, longitude: -72.0000 },
      { latitude: 18.0333, longitude: -71.9167 },
      { latitude: 18.0333, longitude: -72.5833 },
      { latitude: 18.2500, longitude: -72.5833 },
      { latitude: 18.3333, longitude: -72.3333 },
    ],
    description: 'Southeastern department'
  }
];

/**
 * Designated planting zones with optimal conditions
 */
export const PLANTING_ZONES: Region[] = [
  {
    id: 'central_plateau',
    name: 'Central Plateau Reforestation Zone',
    type: 'planting_zone',
    coordinates: [
      { latitude: 19.1500, longitude: -72.0167 },
      { latitude: 19.0333, longitude: -71.9333 },
      { latitude: 18.9167, longitude: -72.0500 },
      { latitude: 19.0333, longitude: -72.1333 },
      { latitude: 19.1500, longitude: -72.0167 },
    ],
    description: 'Priority reforestation area in central Haiti',
    plantingInfo: {
      optimalSpecies: ['cedar', 'pine', 'mahogany'],
      density: 400,
      season: 'April-June, September-November'
    }
  },
  {
    id: 'artibonite_valley',
    name: 'Artibonite Valley Agricultural Zone',
    type: 'planting_zone',
    coordinates: [
      { latitude: 19.4500, longitude: -72.6833 },
      { latitude: 19.2667, longitude: -72.5167 },
      { latitude: 19.1000, longitude: -72.6333 },
      { latitude: 19.2833, longitude: -72.8000 },
      { latitude: 19.4500, longitude: -72.6833 },
    ],
    description: 'Agroforestry zone along Artibonite River',
    plantingInfo: {
      optimalSpecies: ['mango', 'avocado', 'citrus', 'moringa'],
      density: 300,
      season: 'March-May, October-December'
    }
  },
  {
    id: 'kenscoff_mountains',
    name: 'Kenscoff Mountain Reforestation',
    type: 'planting_zone',
    coordinates: [
      { latitude: 18.4500, longitude: -72.2833 },
      { latitude: 18.4167, longitude: -72.2500 },
      { latitude: 18.3833, longitude: -72.2833 },
      { latitude: 18.4167, longitude: -72.3167 },
      { latitude: 18.4500, longitude: -72.2833 },
    ],
    description: 'High altitude reforestation zone',
    plantingInfo: {
      optimalSpecies: ['pine', 'eucalyptus', 'cypress'],
      density: 500,
      season: 'May-July, October-November'
    }
  },
  {
    id: 'macaya_buffer',
    name: 'Pic Macaya Buffer Zone',
    type: 'planting_zone',
    coordinates: [
      { latitude: 18.3833, longitude: -74.0167 },
      { latitude: 18.3333, longitude: -73.9667 },
      { latitude: 18.3000, longitude: -74.0000 },
      { latitude: 18.3500, longitude: -74.0500 },
      { latitude: 18.3833, longitude: -74.0167 },
    ],
    description: 'Buffer zone around Pic Macaya National Park',
    plantingInfo: {
      optimalSpecies: ['endemic_pine', 'native_hardwoods'],
      density: 350,
      season: 'May-June, September-October'
    }
  },
  {
    id: 'nord_coast',
    name: 'Northern Coastal Protection Zone',
    type: 'planting_zone',
    coordinates: [
      { latitude: 19.7833, longitude: -72.2000 },
      { latitude: 19.7500, longitude: -72.1333 },
      { latitude: 19.7167, longitude: -72.1667 },
      { latitude: 19.7500, longitude: -72.2333 },
      { latitude: 19.7833, longitude: -72.2000 },
    ],
    description: 'Coastal erosion prevention zone',
    plantingInfo: {
      optimalSpecies: ['mangrove', 'coconut', 'seagrape'],
      density: 250,
      season: 'April-June'
    }
  }
];

/**
 * Restricted areas where planting is not allowed
 */
export const RESTRICTED_AREAS: Region[] = [
  {
    id: 'port_au_prince_urban',
    name: 'Port-au-Prince Urban Core',
    type: 'restricted',
    coordinates: [
      { latitude: 18.5944, longitude: -72.3074 },
      { latitude: 18.5320, longitude: -72.2935 },
      { latitude: 18.5122, longitude: -72.3388 },
      { latitude: 18.5547, longitude: -72.3608 },
      { latitude: 18.5944, longitude: -72.3074 },
    ],
    description: 'Dense urban area - planting not permitted'
  },
  {
    id: 'pic_macaya_core',
    name: 'Pic Macaya National Park Core',
    type: 'restricted',
    coordinates: [
      { latitude: 18.3667, longitude: -74.0000 },
      { latitude: 18.3500, longitude: -73.9833 },
      { latitude: 18.3333, longitude: -74.0000 },
      { latitude: 18.3500, longitude: -74.0167 },
      { latitude: 18.3667, longitude: -74.0000 },
    ],
    description: 'Protected national park core - special permit required'
  },
  {
    id: 'la_visite_park',
    name: 'La Visite National Park',
    type: 'restricted',
    coordinates: [
      { latitude: 18.3333, longitude: -72.0167 },
      { latitude: 18.3000, longitude: -71.9833 },
      { latitude: 18.2667, longitude: -72.0167 },
      { latitude: 18.3000, longitude: -72.0500 },
      { latitude: 18.3333, longitude: -72.0167 },
    ],
    description: 'Protected national park - special permit required'
  }
];

/**
 * Get all regions combined
 */
export function getAllRegions(): Region[] {
  return [...HAITI_DEPARTMENTS, ...PLANTING_ZONES, ...RESTRICTED_AREAS];
}

/**
 * Find region by coordinates
 */
export function findRegionByCoordinates(lat: number, lon: number): Region | null {
  const point = { latitude: lat, longitude: lon };
  
  for (const region of getAllRegions()) {
    if (isPointInRegion(point, region)) {
      return region;
    }
  }
  
  return null;
}

/**
 * Check if point is in region
 */
function isPointInRegion(point: Coordinate, region: Region): boolean {
  const { coordinates } = region;
  let inside = false;

  for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
    const xi = coordinates[i].longitude;
    const yi = coordinates[i].latitude;
    const xj = coordinates[j].longitude;
    const yj = coordinates[j].latitude;

    const intersect = ((yi > point.latitude) !== (yj > point.latitude))
      && (point.longitude < (xj - xi) * (point.latitude - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Get planting recommendations for a location
 */
export function getPlantingRecommendations(lat: number, lon: number): {
  canPlant: boolean;
  reason?: string;
  recommendations?: {
    species: string[];
    season: string;
    density: number;
  };
} {
  const region = findRegionByCoordinates(lat, lon);
  
  if (!region) {
    return {
      canPlant: false,
      reason: 'Location is outside of Haiti'
    };
  }

  if (region.type === 'restricted') {
    return {
      canPlant: false,
      reason: `This area is restricted: ${region.description}`
    };
  }

  if (region.type === 'planting_zone' && region.plantingInfo) {
    return {
      canPlant: true,
      recommendations: {
        species: region.plantingInfo.optimalSpecies,
        season: region.plantingInfo.season,
        density: region.plantingInfo.density
      }
    };
  }

  // Default recommendations for departments
  return {
    canPlant: true,
    recommendations: {
      species: ['mango', 'moringa', 'cedar', 'bamboo'],
      season: 'April-June, September-November',
      density: 300
    }
  };
}