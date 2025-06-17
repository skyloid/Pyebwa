-- PYEBWA Token Database Schema
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (for authentication)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    public_key VARCHAR(64) UNIQUE NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('family', 'planter', 'admin')),
    email VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Family profiles
CREATE TABLE family_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    family_name VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    language VARCHAR(10) DEFAULT 'en',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Planter profiles
CREATE TABLE planter_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    location_lat DECIMAL(10, 8) NOT NULL,
    location_lon DECIMAL(11, 8) NOT NULL,
    community VARCHAR(255),
    phone_verified BOOLEAN DEFAULT FALSE,
    id_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Heritage items
CREATE TABLE heritage_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES family_profiles(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('photo', 'document', 'audio', 'video')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    ipfs_hash VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    encryption_key VARCHAR(255), -- Encrypted with user's key
    token_cost INTEGER NOT NULL,
    trees_funded DECIMAL(10, 2) NOT NULL,
    language VARCHAR(10),
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Planting submissions
CREATE TABLE planting_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    planter_id UUID REFERENCES planter_profiles(id) ON DELETE CASCADE,
    submission_batch VARCHAR(100) UNIQUE NOT NULL, -- For blockchain reference
    tree_count INTEGER NOT NULL CHECK (tree_count > 0 AND tree_count <= 1000),
    tree_species VARCHAR(50)[],
    location_lat DECIMAL(10, 8) NOT NULL,
    location_lon DECIMAL(11, 8) NOT NULL,
    evidence_ipfs_hash VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'paid')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES users(id),
    verification_notes TEXT,
    payment_amount DECIMAL(10, 2),
    payment_tx_hash VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Planting photos
CREATE TABLE planting_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES planting_submissions(id) ON DELETE CASCADE,
    photo_index INTEGER NOT NULL,
    ipfs_hash VARCHAR(100) NOT NULL,
    location_lat DECIMAL(10, 8) NOT NULL,
    location_lon DECIMAL(11, 8) NOT NULL,
    device_id VARCHAR(100),
    captured_at TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Verification logs
CREATE TABLE verification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES planting_submissions(id) ON DELETE CASCADE,
    verification_type VARCHAR(50) NOT NULL,
    result VARCHAR(20) NOT NULL CHECK (result IN ('pass', 'fail', 'manual_review')),
    score DECIMAL(5, 2),
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Token transactions (for analytics)
CREATE TABLE token_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(100) UNIQUE NOT NULL,
    from_address VARCHAR(64),
    to_address VARCHAR(64),
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(20, 0) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Offline queue (for mobile app)
CREATE TABLE offline_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(100) NOT NULL,
    queue_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    retry_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_users_public_key ON users(public_key);
CREATE INDEX idx_heritage_items_family ON heritage_items(family_id);
CREATE INDEX idx_heritage_items_type ON heritage_items(item_type);
CREATE INDEX idx_planting_submissions_planter ON planting_submissions(planter_id);
CREATE INDEX idx_planting_submissions_status ON planting_submissions(status);
CREATE INDEX idx_planting_submissions_location ON planting_submissions(location_lat, location_lon);
CREATE INDEX idx_planting_photos_submission ON planting_photos(submission_id);
CREATE INDEX idx_verification_logs_submission ON verification_logs(submission_id);
CREATE INDEX idx_token_transactions_type ON token_transactions(transaction_type);
CREATE INDEX idx_offline_queue_device_status ON offline_queue(device_id, status);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();