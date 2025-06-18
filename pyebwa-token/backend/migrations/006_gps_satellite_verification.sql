-- Enable PostGIS extension for spatial operations
CREATE EXTENSION IF NOT EXISTS postgis;

-- Planting Zones Table
CREATE TABLE IF NOT EXISTS planting_zones (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    polygon GEOMETRY(Polygon, 4326) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    restrictions TEXT[] DEFAULT '{}',
    optimal_species TEXT[] NOT NULL,
    elevation_min INTEGER NOT NULL,
    elevation_max INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Spatial index for efficient queries
    INDEX idx_zones_polygon USING GIST(polygon),
    INDEX idx_zones_active (is_active)
);

-- Satellite Imagery Cache Table
CREATE TABLE IF NOT EXISTS satellite_imagery (
    id VARCHAR(255) PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    acquisition_date TIMESTAMP WITH TIME ZONE NOT NULL,
    bounds GEOMETRY(Polygon, 4326) NOT NULL,
    cloud_cover FLOAT NOT NULL,
    resolution FLOAT NOT NULL,
    thumbnail_url TEXT,
    download_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_imagery_date (acquisition_date),
    INDEX idx_imagery_bounds USING GIST(bounds),
    INDEX idx_imagery_provider (provider)
);

-- Vegetation Analysis Results Table
CREATE TABLE IF NOT EXISTS vegetation_analysis (
    id SERIAL PRIMARY KEY,
    location GEOMETRY(Point, 4326) NOT NULL,
    before_date DATE NOT NULL,
    after_date DATE NOT NULL,
    ndvi_before FLOAT,
    ndvi_after FLOAT,
    ndvi_change FLOAT,
    vegetation_area INTEGER,
    increased_area INTEGER,
    confidence FLOAT,
    imagery_before_id VARCHAR(255),
    imagery_after_id VARCHAR(255),
    analysis_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (imagery_before_id) REFERENCES satellite_imagery(id),
    FOREIGN KEY (imagery_after_id) REFERENCES satellite_imagery(id),
    INDEX idx_vegetation_location USING GIST(location),
    INDEX idx_vegetation_dates (before_date, after_date)
);

-- Planting Evidence Table (Enhanced)
CREATE TABLE IF NOT EXISTS planting_evidence (
    id VARCHAR(255) PRIMARY KEY,
    planter_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    total_trees INTEGER NOT NULL,
    species TEXT[] NOT NULL,
    photos JSONB NOT NULL, -- Array of photo objects with hash, location, timestamp
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (planter_id) REFERENCES users(id),
    INDEX idx_evidence_planter (planter_id),
    INDEX idx_evidence_session (session_id),
    INDEX idx_evidence_submitted (submitted_at)
);

-- Verification Logs Table
CREATE TABLE IF NOT EXISTS verification_logs (
    id SERIAL PRIMARY KEY,
    evidence_id VARCHAR(255) NOT NULL,
    checks JSONB NOT NULL,
    score FLOAT NOT NULL,
    verified BOOLEAN NOT NULL,
    details JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (evidence_id) REFERENCES planting_evidence(id),
    INDEX idx_verification_evidence (evidence_id),
    INDEX idx_verification_verified (verified),
    INDEX idx_verification_created (created_at)
);

-- Photo Hashes Table (for duplicate detection)
CREATE TABLE IF NOT EXISTS photo_hashes (
    id SERIAL PRIMARY KEY,
    submission_id VARCHAR(255) NOT NULL,
    planter_id VARCHAR(255) NOT NULL,
    photo_hash VARCHAR(64) NOT NULL,
    perceptual_hash VARCHAR(64),
    location GEOMETRY(Point, 4326) NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (submission_id) REFERENCES planting_evidence(id),
    INDEX idx_photo_hash (photo_hash),
    INDEX idx_photo_phash (perceptual_hash),
    INDEX idx_photo_location USING GIST(location),
    INDEX idx_photo_planter (planter_id)
);

-- Verified Plantings Table
CREATE TABLE IF NOT EXISTS verified_plantings (
    id VARCHAR(255) PRIMARY KEY,
    evidence_id VARCHAR(255) NOT NULL,
    planter_id VARCHAR(255) NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    zone_id VARCHAR(255),
    trees_planted INTEGER NOT NULL,
    trees_verified INTEGER NOT NULL,
    species TEXT[] NOT NULL,
    planted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    verification_score FLOAT NOT NULL,
    tokens_awarded INTEGER NOT NULL,
    satellite_verified BOOLEAN DEFAULT false,
    
    FOREIGN KEY (evidence_id) REFERENCES planting_evidence(id),
    FOREIGN KEY (planter_id) REFERENCES users(id),
    FOREIGN KEY (zone_id) REFERENCES planting_zones(id),
    INDEX idx_verified_planter (planter_id),
    INDEX idx_verified_location USING GIST(location),
    INDEX idx_verified_zone (zone_id),
    INDEX idx_verified_date (planted_at)
);

-- Community Attestations Table
CREATE TABLE IF NOT EXISTS community_attestations (
    id SERIAL PRIMARY KEY,
    evidence_id VARCHAR(255) NOT NULL,
    coordinator_id VARCHAR(255) NOT NULL,
    approved BOOLEAN NOT NULL,
    notes TEXT,
    signature TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (evidence_id) REFERENCES planting_evidence(id),
    FOREIGN KEY (coordinator_id) REFERENCES users(id),
    INDEX idx_attestation_evidence (evidence_id),
    INDEX idx_attestation_coordinator (coordinator_id)
);

-- GPS Cluster Analysis Results
CREATE TABLE IF NOT EXISTS gps_clusters (
    id SERIAL PRIMARY KEY,
    evidence_id VARCHAR(255) NOT NULL,
    center GEOMETRY(Point, 4326) NOT NULL,
    radius FLOAT NOT NULL,
    point_count INTEGER NOT NULL,
    time_span_minutes FLOAT NOT NULL,
    suspicious BOOLEAN DEFAULT false,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (evidence_id) REFERENCES planting_evidence(id),
    INDEX idx_cluster_evidence (evidence_id),
    INDEX idx_cluster_suspicious (suspicious)
);

-- Weather Conditions Log
CREATE TABLE IF NOT EXISTS weather_conditions (
    id SERIAL PRIMARY KEY,
    location GEOMETRY(Point, 4326) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    temperature FLOAT,
    humidity FLOAT,
    rainfall FLOAT,
    wind_speed FLOAT,
    season VARCHAR(20),
    suitable_for_planting BOOLEAN,
    warnings TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_weather_location USING GIST(location),
    INDEX idx_weather_date (recorded_at)
);

-- Coverage Analysis Table
CREATE TABLE IF NOT EXISTS coverage_analysis (
    id SERIAL PRIMARY KEY,
    zone_id VARCHAR(255) NOT NULL,
    analysis_date DATE NOT NULL,
    total_area FLOAT NOT NULL,
    covered_area FLOAT NOT NULL,
    gap_area FLOAT NOT NULL,
    coverage_percent FLOAT NOT NULL,
    gap_polygons JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (zone_id) REFERENCES planting_zones(id),
    INDEX idx_coverage_zone (zone_id),
    INDEX idx_coverage_date (analysis_date)
);

-- Functions for spatial queries

-- Function to check if point is in Haiti
CREATE OR REPLACE FUNCTION is_in_haiti(lat FLOAT, lon FLOAT) RETURNS BOOLEAN AS $$
BEGIN
    RETURN lat >= 18.0 AND lat <= 20.1 AND lon >= -74.5 AND lon <= -71.6;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to find nearest planting zone
CREATE OR REPLACE FUNCTION find_nearest_zone(lat FLOAT, lon FLOAT) RETURNS VARCHAR AS $$
DECLARE
    zone_id VARCHAR;
BEGIN
    SELECT id INTO zone_id
    FROM planting_zones
    WHERE is_active = true
    AND ST_Contains(polygon, ST_SetSRID(ST_MakePoint(lon, lat), 4326))
    LIMIT 1;
    
    RETURN zone_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate planting density
CREATE OR REPLACE FUNCTION calculate_planting_density(
    p_zone_id VARCHAR,
    p_start_date DATE,
    p_end_date DATE
) RETURNS TABLE(
    grid_cell GEOMETRY,
    tree_count INTEGER,
    density_per_hectare FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH grid AS (
        SELECT ST_SquareGrid(0.001, polygon) AS cell -- ~100m x 100m cells
        FROM planting_zones
        WHERE id = p_zone_id
    )
    SELECT 
        g.cell,
        COUNT(vp.id)::INTEGER as tree_count,
        COUNT(vp.id) * 10000.0 / ST_Area(g.cell::geography) as density_per_hectare
    FROM grid g
    LEFT JOIN verified_plantings vp ON ST_Contains(g.cell, vp.location)
        AND vp.planted_at BETWEEN p_start_date AND p_end_date
    GROUP BY g.cell;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_planting_zones_updated_at
    BEFORE UPDATE ON planting_zones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Views for analytics

-- Planting activity heatmap
CREATE OR REPLACE VIEW planting_heatmap AS
SELECT 
    zone_id,
    DATE_TRUNC('week', planted_at) as week,
    COUNT(*) as plantings,
    SUM(trees_verified) as total_trees,
    AVG(verification_score) as avg_score,
    ST_Centroid(ST_Collect(location)) as center_point
FROM verified_plantings
GROUP BY zone_id, DATE_TRUNC('week', planted_at);

-- Zone performance metrics
CREATE OR REPLACE VIEW zone_performance AS
SELECT 
    pz.id as zone_id,
    pz.name as zone_name,
    COUNT(DISTINCT vp.planter_id) as unique_planters,
    COUNT(vp.id) as total_plantings,
    SUM(vp.trees_verified) as total_trees,
    AVG(vp.verification_score) as avg_verification_score,
    MAX(vp.planted_at) as last_planting,
    COALESCE(ca.coverage_percent, 0) as coverage_percent
FROM planting_zones pz
LEFT JOIN verified_plantings vp ON pz.id = vp.zone_id
LEFT JOIN LATERAL (
    SELECT coverage_percent 
    FROM coverage_analysis 
    WHERE zone_id = pz.id 
    ORDER BY analysis_date DESC 
    LIMIT 1
) ca ON true
WHERE pz.is_active = true
GROUP BY pz.id, pz.name, ca.coverage_percent;

-- Suspicious activity detection
CREATE OR REPLACE VIEW suspicious_activities AS
SELECT 
    pe.id as evidence_id,
    pe.planter_id,
    pe.submitted_at,
    gc.suspicious as cluster_suspicious,
    gc.reason as cluster_reason,
    vl.score as verification_score,
    vl.verified,
    COUNT(ph.id) as duplicate_photos
FROM planting_evidence pe
LEFT JOIN gps_clusters gc ON pe.id = gc.evidence_id AND gc.suspicious = true
LEFT JOIN verification_logs vl ON pe.id = vl.evidence_id
LEFT JOIN photo_hashes ph ON pe.id = ph.submission_id
GROUP BY pe.id, pe.planter_id, pe.submitted_at, 
         gc.suspicious, gc.reason, vl.score, vl.verified
HAVING gc.suspicious = true OR vl.verified = false OR COUNT(ph.id) > 1;