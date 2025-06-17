-- IPFS Content Index Table
CREATE TABLE IF NOT EXISTS ipfs_content (
    hash VARCHAR(255) PRIMARY KEY,
    filename VARCHAR(500) NOT NULL,
    size BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    encrypted BOOLEAN DEFAULT false,
    providers TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    
    -- Indexes for searching
    INDEX idx_ipfs_filename (filename),
    INDEX idx_ipfs_type (type),
    INDEX idx_ipfs_created (created_at),
    INDEX idx_ipfs_accessed (last_accessed)
);

-- IPFS Upload Sessions Table (for tracking chunked uploads)
CREATE TABLE IF NOT EXISTS ipfs_upload_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    filename VARCHAR(500) NOT NULL,
    total_size BIGINT NOT NULL,
    total_chunks INTEGER NOT NULL,
    uploaded_chunks INTEGER DEFAULT 0,
    chunk_size INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_upload_user (user_id),
    INDEX idx_upload_status (status),
    INDEX idx_upload_started (started_at)
);

-- IPFS Provider Stats Table
CREATE TABLE IF NOT EXISTS ipfs_provider_stats (
    provider VARCHAR(50) PRIMARY KEY,
    total_uploads BIGINT DEFAULT 0,
    total_errors BIGINT DEFAULT 0,
    total_bytes BIGINT DEFAULT 0,
    last_health_check TIMESTAMP WITH TIME ZONE,
    is_healthy BOOLEAN DEFAULT true,
    average_upload_time FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial provider records
INSERT INTO ipfs_provider_stats (provider) VALUES 
    ('pinata'),
    ('web3storage'),
    ('infura'),
    ('filebase')
ON CONFLICT (provider) DO NOTHING;

-- Gateway Performance Table
CREATE TABLE IF NOT EXISTS ipfs_gateway_stats (
    gateway_url VARCHAR(500) PRIMARY KEY,
    total_requests BIGINT DEFAULT 0,
    total_failures BIGINT DEFAULT 0,
    average_response_time FLOAT,
    last_checked TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial gateways
INSERT INTO ipfs_gateway_stats (gateway_url) VALUES 
    ('https://gateway.pinata.cloud/ipfs/'),
    ('https://cloudflare-ipfs.com/ipfs/'),
    ('https://ipfs.io/ipfs/'),
    ('https://gateway.ipfs.io/ipfs/'),
    ('https://dweb.link/ipfs/')
ON CONFLICT (gateway_url) DO NOTHING;

-- Content Cache Table (for frequently accessed content)
CREATE TABLE IF NOT EXISTS ipfs_cache (
    hash VARCHAR(255) PRIMARY KEY,
    content BYTEA NOT NULL,
    size INTEGER NOT NULL,
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    hit_count INTEGER DEFAULT 0,
    
    INDEX idx_cache_expires (expires_at)
);

-- Function to update provider stats
CREATE OR REPLACE FUNCTION update_provider_stats(
    p_provider VARCHAR,
    p_success BOOLEAN,
    p_bytes BIGINT,
    p_upload_time FLOAT
) RETURNS VOID AS $$
BEGIN
    UPDATE ipfs_provider_stats
    SET 
        total_uploads = CASE WHEN p_success THEN total_uploads + 1 ELSE total_uploads END,
        total_errors = CASE WHEN NOT p_success THEN total_errors + 1 ELSE total_errors END,
        total_bytes = CASE WHEN p_success THEN total_bytes + p_bytes ELSE total_bytes END,
        average_upload_time = CASE 
            WHEN p_success AND average_upload_time IS NULL THEN p_upload_time
            WHEN p_success THEN (average_upload_time * total_uploads + p_upload_time) / (total_uploads + 1)
            ELSE average_upload_time
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE provider = p_provider;
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired cache
CREATE OR REPLACE FUNCTION clean_expired_cache() RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ipfs_cache WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create views for analytics
CREATE OR REPLACE VIEW ipfs_storage_summary AS
SELECT
    COUNT(*) as total_files,
    SUM(size) as total_size,
    COUNT(CASE WHEN encrypted THEN 1 END) as encrypted_files,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '24 hours' THEN 1 END) as files_last_24h,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as files_last_7d,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as files_last_30d
FROM ipfs_content;

CREATE OR REPLACE VIEW ipfs_type_distribution AS
SELECT
    type,
    COUNT(*) as file_count,
    SUM(size) as total_size,
    ROUND(AVG(size)) as avg_size,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM ipfs_content), 2) as percentage
FROM ipfs_content
GROUP BY type
ORDER BY file_count DESC;

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ipfs_provider_stats_updated_at
    BEFORE UPDATE ON ipfs_provider_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();