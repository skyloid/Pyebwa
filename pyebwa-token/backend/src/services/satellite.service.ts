import axios from 'axios';
import { logger } from '../utils/logger';
import { Pool } from 'pg';
import * as turf from '@turf/turf';
import { Feature, Point, Polygon } from 'geojson';

interface SatelliteImagery {
  id: string;
  acquisitionDate: Date;
  cloudCover: number;
  resolution: number;
  bounds: [number, number, number, number];
  thumbnailUrl: string;
  downloadUrl?: string;
  provider: 'planet' | 'sentinel' | 'landsat';
}

interface VegetationAnalysis {
  ndvi: number; // Normalized Difference Vegetation Index
  ndviChange: number;
  vegetationArea: number; // in square meters
  increasedVegetationArea: number;
  confidence: number;
  analysisDate: Date;
}

interface PlantingZone {
  id: string;
  name: string;
  polygon: Polygon;
  isActive: boolean;
  restrictions?: string[];
  optimalSpecies: string[];
  elevationRange: [number, number];
}

export class SatelliteService {
  private pool: Pool;
  private planetApiKey: string;
  private plantingZones: Map<string, PlantingZone> = new Map();
  
  // Haiti boundaries
  private readonly HAITI_BOUNDS = {
    north: 20.1,
    south: 18.0,
    east: -71.6,
    west: -74.5,
  };

  // Elevation data for Haiti's major regions
  private readonly ELEVATION_DATA = {
    'Massif de la Hotte': { min: 500, max: 2347 },
    'Massif de la Selle': { min: 600, max: 2680 },
    'Chaîne des Matheux': { min: 400, max: 1575 },
    'Montagnes Noires': { min: 300, max: 1793 },
    'Plateau Central': { min: 200, max: 500 },
    'Plaine du Nord': { min: 0, max: 200 },
  };

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    this.planetApiKey = process.env.PLANET_API_KEY!;
    
    // Initialize planting zones
    this.initializePlantingZones();
  }

  /**
   * Initialize approved planting zones in Haiti
   */
  private async initializePlantingZones() {
    // Define major reforestation zones
    const zones: PlantingZone[] = [
      {
        id: 'kenscoff',
        name: 'Kenscoff Reforestation Zone',
        polygon: turf.polygon([[
          [-72.2936, 18.4476],
          [-72.2847, 18.4476],
          [-72.2847, 18.4387],
          [-72.2936, 18.4387],
          [-72.2936, 18.4476],
        ]]).geometry,
        isActive: true,
        optimalSpecies: ['pine', 'eucalyptus', 'cedar'],
        elevationRange: [1500, 2200],
      },
      {
        id: 'pic_macaya',
        name: 'Pic Macaya National Park Buffer',
        polygon: turf.polygon([[
          [-74.0236, 18.3812],
          [-73.9847, 18.3812],
          [-73.9847, 18.3423],
          [-74.0236, 18.3423],
          [-74.0236, 18.3812],
        ]]).geometry,
        isActive: true,
        restrictions: ['protected_area_buffer'],
        optimalSpecies: ['endemic_pine', 'mahogany', 'cedar'],
        elevationRange: [1000, 2347],
      },
      {
        id: 'cotes_de_fer',
        name: 'Côtes de Fer Coastal Restoration',
        polygon: turf.polygon([[
          [-72.7936, 18.2476],
          [-72.7547, 18.2476],
          [-72.7547, 18.2087],
          [-72.7936, 18.2087],
          [-72.7936, 18.2476],
        ]]).geometry,
        isActive: true,
        optimalSpecies: ['mangrove', 'coconut', 'seagrape'],
        elevationRange: [0, 100],
      },
      {
        id: 'central_plateau',
        name: 'Central Plateau Agroforestry',
        polygon: turf.polygon([[
          [-72.1936, 19.0476],
          [-72.0547, 19.0476],
          [-72.0547, 18.9087],
          [-72.1936, 18.9087],
          [-72.1936, 19.0476],
        ]]).geometry,
        isActive: true,
        optimalSpecies: ['mango', 'avocado', 'coffee', 'cacao'],
        elevationRange: [200, 500],
      },
    ];

    // Store in memory and database
    for (const zone of zones) {
      this.plantingZones.set(zone.id, zone);
      await this.savePlantingZone(zone);
    }

    logger.info(`Initialized ${zones.length} planting zones`);
  }

  /**
   * Search for satellite imagery
   */
  async searchImagery(
    location: { latitude: number; longitude: number },
    dateRange: { start: Date; end: Date },
    maxCloudCover: number = 20
  ): Promise<SatelliteImagery[]> {
    try {
      // Create search area (1km radius around point)
      const searchArea = turf.circle([location.longitude, location.latitude], 1, {
        units: 'kilometers',
      });

      // Planet API search
      const searchRequest = {
        item_types: ['PSScene'],
        filter: {
          type: 'AndFilter',
          config: [
            {
              type: 'GeometryFilter',
              field_name: 'geometry',
              config: searchArea.geometry,
            },
            {
              type: 'DateRangeFilter',
              field_name: 'acquired',
              config: {
                gte: dateRange.start.toISOString(),
                lte: dateRange.end.toISOString(),
              },
            },
            {
              type: 'RangeFilter',
              field_name: 'cloud_cover',
              config: {
                lte: maxCloudCover / 100,
              },
            },
          ],
        },
      };

      const response = await axios.post(
        'https://api.planet.com/data/v1/quick-search',
        searchRequest,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(this.planetApiKey + ':').toString('base64')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const imagery: SatelliteImagery[] = response.data.features.map((feature: any) => ({
        id: feature.id,
        acquisitionDate: new Date(feature.properties.acquired),
        cloudCover: feature.properties.cloud_cover * 100,
        resolution: feature.properties.pixel_resolution,
        bounds: turf.bbox(feature.geometry),
        thumbnailUrl: feature._links.thumbnail,
        provider: 'planet',
      }));

      // Also check for free Sentinel-2 imagery
      const sentinelImagery = await this.searchSentinelImagery(
        location,
        dateRange,
        maxCloudCover
      );

      return [...imagery, ...sentinelImagery].sort(
        (a, b) => b.acquisitionDate.getTime() - a.acquisitionDate.getTime()
      );
    } catch (error) {
      logger.error('Satellite imagery search error:', error);
      return [];
    }
  }

  /**
   * Search Sentinel-2 imagery (free alternative)
   */
  private async searchSentinelImagery(
    location: { latitude: number; longitude: number },
    dateRange: { start: Date; end: Date },
    maxCloudCover: number
  ): Promise<SatelliteImagery[]> {
    try {
      // Use Copernicus Open Access Hub or AWS
      const bbox = [
        location.longitude - 0.01,
        location.latitude - 0.01,
        location.longitude + 0.01,
        location.latitude + 0.01,
      ];

      const response = await axios.get(
        `https://earth-search.aws.element84.com/v0/search`,
        {
          params: {
            collections: 'sentinel-s2-l2a-cogs',
            bbox: bbox.join(','),
            datetime: `${dateRange.start.toISOString()}/${dateRange.end.toISOString()}`,
            'eo:cloud_cover': `<${maxCloudCover}`,
            limit: 10,
          },
        }
      );

      return response.data.features.map((feature: any) => ({
        id: feature.id,
        acquisitionDate: new Date(feature.properties.datetime),
        cloudCover: feature.properties['eo:cloud_cover'],
        resolution: 10, // Sentinel-2 resolution
        bounds: feature.bbox,
        thumbnailUrl: feature.assets.thumbnail?.href,
        provider: 'sentinel',
      }));
    } catch (error) {
      logger.error('Sentinel imagery search error:', error);
      return [];
    }
  }

  /**
   * Analyze vegetation change between two dates
   */
  async analyzeVegetationChange(
    location: { latitude: number; longitude: number },
    beforeDate: Date,
    afterDate: Date
  ): Promise<VegetationAnalysis> {
    try {
      // Get imagery for both dates
      const beforeImagery = await this.searchImagery(
        location,
        {
          start: new Date(beforeDate.getTime() - 30 * 24 * 60 * 60 * 1000),
          end: beforeDate,
        },
        30
      );

      const afterImagery = await this.searchImagery(
        location,
        {
          start: afterDate,
          end: new Date(afterDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
        30
      );

      if (beforeImagery.length === 0 || afterImagery.length === 0) {
        return {
          ndvi: 0,
          ndviChange: 0,
          vegetationArea: 0,
          increasedVegetationArea: 0,
          confidence: 0,
          analysisDate: new Date(),
        };
      }

      // Calculate NDVI for both images
      const beforeNDVI = await this.calculateNDVI(beforeImagery[0]);
      const afterNDVI = await this.calculateNDVI(afterImagery[0]);

      // Estimate vegetation change
      const ndviChange = afterNDVI.avgNDVI - beforeNDVI.avgNDVI;
      const vegetationIncrease = afterNDVI.vegetatedPixels - beforeNDVI.vegetatedPixels;
      const pixelArea = 100; // 10m x 10m for Sentinel-2

      return {
        ndvi: afterNDVI.avgNDVI,
        ndviChange,
        vegetationArea: afterNDVI.vegetatedPixels * pixelArea,
        increasedVegetationArea: vegetationIncrease * pixelArea,
        confidence: this.calculateConfidence(beforeImagery[0], afterImagery[0]),
        analysisDate: new Date(),
      };
    } catch (error) {
      logger.error('Vegetation analysis error:', error);
      throw error;
    }
  }

  /**
   * Validate GPS coordinates for planting
   */
  async validateGPSCoordinates(
    latitude: number,
    longitude: number
  ): Promise<{
    valid: boolean;
    reason?: string;
    zone?: PlantingZone;
    elevation?: number;
  }> {
    // Check if within Haiti bounds
    if (
      latitude < this.HAITI_BOUNDS.south ||
      latitude > this.HAITI_BOUNDS.north ||
      longitude < this.HAITI_BOUNDS.west ||
      longitude > this.HAITI_BOUNDS.east
    ) {
      return {
        valid: false,
        reason: 'Coordinates outside Haiti boundaries',
      };
    }

    // Check if in approved planting zone
    const point = turf.point([longitude, latitude]);
    let foundZone: PlantingZone | undefined;

    for (const [_, zone] of this.plantingZones) {
      if (zone.isActive && turf.booleanPointInPolygon(point, zone.polygon)) {
        foundZone = zone;
        break;
      }
    }

    if (!foundZone) {
      return {
        valid: false,
        reason: 'Location not in approved planting zone',
      };
    }

    // Get elevation data
    const elevation = await this.getElevation(latitude, longitude);

    // Validate elevation for zone
    if (
      elevation < foundZone.elevationRange[0] ||
      elevation > foundZone.elevationRange[1]
    ) {
      return {
        valid: false,
        reason: `Elevation ${elevation}m outside zone range ${foundZone.elevationRange[0]}-${foundZone.elevationRange[1]}m`,
        zone: foundZone,
        elevation,
      };
    }

    return {
      valid: true,
      zone: foundZone,
      elevation,
    };
  }

  /**
   * Cluster GPS coordinates to detect batch plantings
   */
  async clusterCoordinates(
    coordinates: Array<{ latitude: number; longitude: number; timestamp: Date }>
  ): Promise<{
    clusters: Array<{
      center: [number, number];
      points: number;
      radius: number;
      timeSpan: number;
    }>;
    suspicious: boolean;
    reason?: string;
  }> {
    // Convert to GeoJSON points
    const points = coordinates.map(coord =>
      turf.point([coord.longitude, coord.latitude], { timestamp: coord.timestamp })
    );

    // Use DBSCAN clustering with 50m radius
    const clustered = turf.clustersDbscan(turf.featureCollection(points), 0.05, {
      units: 'kilometers',
      minPoints: 3,
    });

    // Analyze clusters
    const clusters: Map<number, any[]> = new Map();
    
    clustered.features.forEach(feature => {
      const cluster = feature.properties?.cluster;
      if (cluster !== undefined) {
        if (!clusters.has(cluster)) {
          clusters.set(cluster, []);
        }
        clusters.get(cluster)!.push(feature);
      }
    });

    // Process clusters
    const clusterResults = Array.from(clusters.entries()).map(([_, features]) => {
      const coords = features.map(f => f.geometry.coordinates);
      const center = turf.center(turf.featureCollection(features)).geometry.coordinates;
      const distances = coords.map(c => turf.distance(center, c, { units: 'meters' }));
      const radius = Math.max(...distances);

      const timestamps = features.map(f => new Date(f.properties.timestamp).getTime());
      const timeSpan = Math.max(...timestamps) - Math.min(...timestamps);

      return {
        center: center as [number, number],
        points: features.length,
        radius,
        timeSpan: timeSpan / 1000 / 60, // minutes
      };
    });

    // Check for suspicious patterns
    let suspicious = false;
    let reason: string | undefined;

    // Too many trees in small area
    const denseCluster = clusterResults.find(c => c.points > 50 && c.radius < 10);
    if (denseCluster) {
      suspicious = true;
      reason = 'Unusually dense planting pattern detected';
    }

    // Too fast planting
    const fastCluster = clusterResults.find(c => c.points / (c.timeSpan / 60) > 100);
    if (fastCluster) {
      suspicious = true;
      reason = 'Planting rate exceeds realistic limits';
    }

    return {
      clusters: clusterResults,
      suspicious,
      reason,
    };
  }

  /**
   * Create heatmap data for plantings
   */
  async generatePlantingHeatmap(
    startDate: Date,
    endDate: Date
  ): Promise<{
    type: 'FeatureCollection';
    features: Feature<Point>[];
  }> {
    const query = `
      SELECT 
        latitude, 
        longitude, 
        COUNT(*) as tree_count,
        array_agg(DISTINCT species) as species_list
      FROM verified_plantings
      WHERE planted_at BETWEEN $1 AND $2
      GROUP BY latitude, longitude
    `;

    const result = await this.pool.query(query, [startDate, endDate]);

    const features = result.rows.map(row =>
      turf.point([row.longitude, row.latitude], {
        treeCount: parseInt(row.tree_count),
        species: row.species_list,
        intensity: Math.min(parseInt(row.tree_count) / 100, 1),
      })
    );

    return turf.featureCollection(features);
  }

  /**
   * Check weather conditions for planting validation
   */
  async checkWeatherConditions(
    latitude: number,
    longitude: number,
    date: Date
  ): Promise<{
    suitable: boolean;
    conditions: {
      temperature: number;
      humidity: number;
      rainfall: number;
      season: string;
    };
    warnings: string[];
  }> {
    try {
      // Get weather data from OpenWeatherMap or similar
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/onecall/timemachine`,
        {
          params: {
            lat: latitude,
            lon: longitude,
            dt: Math.floor(date.getTime() / 1000),
            appid: process.env.OPENWEATHER_API_KEY,
            units: 'metric',
          },
        }
      );

      const weather = response.data.current;
      const temp = weather.temp;
      const humidity = weather.humidity;
      const rainfall = weather.rain?.['1h'] || 0;

      // Determine season (Haiti has wet/dry seasons)
      const month = date.getMonth();
      const season = [4, 5, 9, 10].includes(month) ? 'wet' : 'dry';

      const warnings: string[] = [];
      let suitable = true;

      // Temperature checks
      if (temp > 35) {
        warnings.push('Temperature too high for planting');
        suitable = false;
      } else if (temp < 15) {
        warnings.push('Temperature too low for tropical species');
        suitable = false;
      }

      // Humidity checks
      if (humidity < 40 && season === 'dry') {
        warnings.push('Low humidity during dry season - ensure irrigation');
      }

      // Rainfall checks
      if (rainfall > 50) {
        warnings.push('Heavy rainfall may wash away seedlings');
        suitable = false;
      }

      // Seasonal checks
      if (season === 'dry' && month !== 11 && month !== 12) {
        warnings.push('Planting during dry season requires extra care');
      }

      return {
        suitable,
        conditions: {
          temperature: temp,
          humidity,
          rainfall,
          season,
        },
        warnings,
      };
    } catch (error) {
      logger.error('Weather check error:', error);
      // Don't fail verification due to weather API issues
      return {
        suitable: true,
        conditions: {
          temperature: 25,
          humidity: 70,
          rainfall: 0,
          season: 'unknown',
        },
        warnings: ['Weather data unavailable'],
      };
    }
  }

  /**
   * Detect coverage gaps in planting areas
   */
  async detectCoverageGaps(
    zoneId: string
  ): Promise<{
    gaps: Array<{
      polygon: Polygon;
      area: number;
      priority: 'high' | 'medium' | 'low';
      recommendedSpecies: string[];
    }>;
    totalGapArea: number;
    coveragePercent: number;
  }> {
    const zone = this.plantingZones.get(zoneId);
    if (!zone) {
      throw new Error('Zone not found');
    }

    // Get all plantings in zone
    const query = `
      SELECT latitude, longitude, trees_planted
      FROM verified_plantings
      WHERE ST_Contains(
        ST_GeomFromGeoJSON($1),
        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
      )
    `;

    const result = await this.pool.query(query, [JSON.stringify(zone.polygon)]);

    // Create coverage polygons (100m radius per planting)
    const coveragePolygons = result.rows.map(row =>
      turf.circle([row.longitude, row.latitude], 0.1, { units: 'kilometers' })
    );

    // Union all coverage areas
    let coverage = coveragePolygons[0];
    for (let i = 1; i < coveragePolygons.length; i++) {
      coverage = turf.union(coverage, coveragePolygons[i]) || coverage;
    }

    // Calculate gaps
    const zoneFeature = turf.feature(zone.polygon);
    const gaps = coverage
      ? turf.difference(zoneFeature, coverage)
      : zoneFeature;

    if (!gaps) {
      return {
        gaps: [],
        totalGapArea: 0,
        coveragePercent: 100,
      };
    }

    // Process gap polygons
    const gapPolygons = gaps.geometry.type === 'Polygon' 
      ? [gaps.geometry]
      : gaps.geometry.coordinates.map(coords => ({ type: 'Polygon' as const, coordinates: coords }));

    const gapAreas = gapPolygons.map(polygon => {
      const area = turf.area(turf.feature(polygon));
      const priority = area > 10000 ? 'high' : area > 5000 ? 'medium' : 'low';

      return {
        polygon,
        area,
        priority,
        recommendedSpecies: zone.optimalSpecies,
      };
    });

    const totalGapArea = gapAreas.reduce((sum, gap) => sum + gap.area, 0);
    const zoneArea = turf.area(zoneFeature);
    const coveragePercent = ((zoneArea - totalGapArea) / zoneArea) * 100;

    return {
      gaps: gapAreas,
      totalGapArea,
      coveragePercent,
    };
  }

  /**
   * Helper: Calculate NDVI from imagery
   */
  private async calculateNDVI(
    imagery: SatelliteImagery
  ): Promise<{ avgNDVI: number; vegetatedPixels: number }> {
    // Simplified NDVI calculation
    // In production, would download and process actual imagery
    const mockNDVI = 0.3 + Math.random() * 0.4; // 0.3-0.7 typical for vegetation
    const mockPixels = 1000 + Math.floor(Math.random() * 5000);

    return {
      avgNDVI: mockNDVI,
      vegetatedPixels: mockPixels,
    };
  }

  /**
   * Helper: Calculate analysis confidence
   */
  private calculateConfidence(
    before: SatelliteImagery,
    after: SatelliteImagery
  ): number {
    const daysDiff = Math.abs(
      after.acquisitionDate.getTime() - before.acquisitionDate.getTime()
    ) / (1000 * 60 * 60 * 24);

    const cloudScore = 1 - (before.cloudCover + after.cloudCover) / 200;
    const timeScore = Math.max(0, 1 - daysDiff / 365);
    const resolutionScore = Math.min(before.resolution, after.resolution) <= 10 ? 1 : 0.7;

    return (cloudScore + timeScore + resolutionScore) / 3;
  }

  /**
   * Helper: Get elevation from SRTM data
   */
  private async getElevation(
    latitude: number,
    longitude: number
  ): Promise<number> {
    try {
      // Use Open Elevation API or similar
      const response = await axios.get(
        `https://api.open-elevation.com/api/v1/lookup`,
        {
          params: {
            locations: `${latitude},${longitude}`,
          },
        }
      );

      return response.data.results[0].elevation;
    } catch (error) {
      logger.error('Elevation lookup error:', error);
      // Return approximate based on region
      return 300; // Default mid-elevation
    }
  }

  /**
   * Database operations
   */
  private async savePlantingZone(zone: PlantingZone): Promise<void> {
    const query = `
      INSERT INTO planting_zones (
        id, name, polygon, is_active, 
        restrictions, optimal_species, 
        elevation_min, elevation_max
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE
      SET name = $2, polygon = $3, is_active = $4
    `;

    await this.pool.query(query, [
      zone.id,
      zone.name,
      JSON.stringify(zone.polygon),
      zone.isActive,
      zone.restrictions || [],
      zone.optimalSpecies,
      zone.elevationRange[0],
      zone.elevationRange[1],
    ]);
  }
}

// Export singleton instance
export const satelliteService = new SatelliteService();