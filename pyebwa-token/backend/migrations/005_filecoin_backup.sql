-- Filecoin Backup Jobs Table
CREATE TABLE IF NOT EXISTS filecoin_backups (
    id VARCHAR(255) PRIMARY KEY,
    ipfs_hash VARCHAR(255) NOT NULL,
    filecoin_cid VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'queued',
    priority INTEGER DEFAULT 1,
    attempts INTEGER DEFAULT 0,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    INDEX idx_backup_ipfs (ipfs_hash),
    INDEX idx_backup_status (status),
    INDEX idx_backup_priority (priority DESC),
    INDEX idx_backup_created (created_at)
);

-- Filecoin Deals Table
CREATE TABLE IF NOT EXISTS filecoin_deals (
    cid VARCHAR(255) PRIMARY KEY,
    deal_id VARCHAR(255),
    miner VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    size BIGINT NOT NULL,
    cost DECIMAL(20, 8),
    piece_cid VARCHAR(255),
    
    INDEX idx_deal_status (status),
    INDEX idx_deal_expires (expires_at),
    INDEX idx_deal_miner (miner)
);

-- Arweave Backup Table (for additional permanent storage)
CREATE TABLE IF NOT EXISTS arweave_backups (
    id VARCHAR(255) PRIMARY KEY,
    ipfs_hash VARCHAR(255) NOT NULL,
    arweave_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    size BIGINT NOT NULL,
    cost DECIMAL(20, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    block_height BIGINT,
    
    INDEX idx_arweave_ipfs (ipfs_hash),
    INDEX idx_arweave_status (status)
);

-- Backup Policy Table
CREATE TABLE IF NOT EXISTS backup_policies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_types TEXT[] DEFAULT '{}',
    min_size BIGINT DEFAULT 0,
    max_size BIGINT,
    backup_providers TEXT[] DEFAULT '{filecoin}',
    retention_days INTEGER,
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default backup policies
INSERT INTO backup_policies (name, description, file_types, min_size, backup_providers, priority) VALUES
    ('Heritage Media', 'Family photos and videos', '{image,video}', 1048576, '{filecoin,arweave}', 10),
    ('Documents', 'Important documents', '{document}', 524288, '{filecoin}', 8),
    ('Large Media', 'Large video files', '{video}', 52428800, '{filecoin}', 6),
    ('Audio Heritage', 'Voice recordings and music', '{audio}', 1048576, '{filecoin}', 7);

-- Backup Analytics View
CREATE OR REPLACE VIEW backup_analytics AS
SELECT
    fb.status,
    COUNT(*) as job_count,
    COUNT(DISTINCT fb.ipfs_hash) as unique_files,
    SUM(CASE WHEN fd.cid IS NOT NULL THEN fd.size ELSE 0 END) as total_backed_up_size,
    AVG(EXTRACT(EPOCH FROM (fb.completed_at - fb.created_at))) as avg_backup_time_seconds,
    COUNT(CASE WHEN fb.attempts > 1 THEN 1 END) as retry_count
FROM filecoin_backups fb
LEFT JOIN filecoin_deals fd ON fb.filecoin_cid = fd.cid
GROUP BY fb.status;

-- Function to queue automatic backups based on policies
CREATE OR REPLACE FUNCTION queue_policy_backups() RETURNS INTEGER AS $$
DECLARE
    queued_count INTEGER := 0;
    content_row RECORD;
    policy_row RECORD;
BEGIN
    -- For each active policy
    FOR policy_row IN SELECT * FROM backup_policies WHERE is_active = true LOOP
        -- Find matching content not yet backed up
        FOR content_row IN 
            SELECT ic.* 
            FROM ipfs_content ic
            LEFT JOIN filecoin_backups fb ON ic.hash = fb.ipfs_hash
            WHERE fb.id IS NULL
            AND ic.type = ANY(policy_row.file_types)
            AND ic.size >= policy_row.min_size
            AND (policy_row.max_size IS NULL OR ic.size <= policy_row.max_size)
            LIMIT 100
        LOOP
            -- Queue backup job
            INSERT INTO filecoin_backups (
                id, ipfs_hash, status, priority
            ) VALUES (
                'auto_' || gen_random_uuid(),
                content_row.hash,
                'queued',
                policy_row.priority
            );
            queued_count := queued_count + 1;
        END LOOP;
    END LOOP;
    
    RETURN queued_count;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate backup costs
CREATE OR REPLACE FUNCTION calculate_backup_costs(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE(
    provider TEXT,
    total_size BIGINT,
    total_cost DECIMAL(20, 8),
    deal_count INTEGER
) AS $$
BEGIN
    -- Filecoin costs
    RETURN QUERY
    SELECT 
        'filecoin'::TEXT as provider,
        SUM(size)::BIGINT as total_size,
        SUM(cost)::DECIMAL(20, 8) as total_cost,
        COUNT(*)::INTEGER as deal_count
    FROM filecoin_deals
    WHERE created_at BETWEEN p_start_date AND p_end_date
    AND status = 'active';
    
    -- Arweave costs
    RETURN QUERY
    SELECT 
        'arweave'::TEXT as provider,
        SUM(size)::BIGINT as total_size,
        SUM(cost)::DECIMAL(20, 8) as total_cost,
        COUNT(*)::INTEGER as deal_count
    FROM arweave_backups
    WHERE created_at BETWEEN p_start_date AND p_end_date
    AND status = 'confirmed';
END;
$$ LANGUAGE plpgsql;

-- Scheduled job to check expiring deals
CREATE OR REPLACE FUNCTION check_expiring_deals() RETURNS VOID AS $$
DECLARE
    deal_row RECORD;
BEGIN
    FOR deal_row IN 
        SELECT * FROM filecoin_deals 
        WHERE status = 'active' 
        AND expires_at < NOW() + INTERVAL '30 days'
    LOOP
        -- Log expiring deal
        INSERT INTO system_logs (
            level, message, context, created_at
        ) VALUES (
            'warning',
            'Filecoin deal expiring soon',
            jsonb_build_object(
                'deal_id', deal_row.deal_id,
                'cid', deal_row.cid,
                'expires_at', deal_row.expires_at
            ),
            NOW()
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;