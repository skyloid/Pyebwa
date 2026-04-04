-- Pyebwa Family Tree Database Schema
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin', 'superadmin')),
    photo_url TEXT,
    primary_family_tree_id UUID,
    email_verified BOOLEAN DEFAULT false,
    notifications_enabled BOOLEAN DEFAULT true,
    email_notifications_enabled BOOLEAN DEFAULT true,
    notification_preferences JSONB DEFAULT '{}',
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMPTZ,
    last_active TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family trees table
CREATE TABLE IF NOT EXISTS family_trees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT false,
    settings JSONB DEFAULT '{"allowMemberInvites": true, "moderateContent": false}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family tree members (join table for users who have access to a tree)
CREATE TABLE IF NOT EXISTS family_tree_members (
    family_tree_id UUID NOT NULL REFERENCES family_trees(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (family_tree_id, user_id)
);

-- Persons (family tree entries - the actual people in the tree)
CREATE TABLE IF NOT EXISTS persons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_tree_id UUID NOT NULL REFERENCES family_trees(id) ON DELETE CASCADE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) DEFAULT '',
    birth_date DATE,
    death_date DATE,
    biography TEXT DEFAULT '',
    email VARCHAR(255),
    phone VARCHAR(50),
    gender VARCHAR(20),
    photos JSONB DEFAULT '[]',
    relationships JSONB DEFAULT '[]',
    search_terms JSONB DEFAULT '[]',
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    claimed_at TIMESTAMPTZ,
    claimed_via_invite BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invites table
CREATE TABLE IF NOT EXISTS invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR(255) UNIQUE NOT NULL,
    tree_id UUID NOT NULL REFERENCES family_trees(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    person_name VARCHAR(255),
    person_email VARCHAR(255),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
    accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    accepted_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin logs table
CREATE TABLE IF NOT EXISTS admin_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    user_id VARCHAR(255),
    admin_email VARCHAR(255),
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500),
    subject VARCHAR(500),
    content TEXT,
    tree_id UUID REFERENCES family_trees(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'draft',
    recipients JSONB DEFAULT '{}',
    options JSONB DEFAULT '{}',
    stats JSONB DEFAULT '{}',
    sent_at TIMESTAMPTZ,
    sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content table (key-value store for app settings/content)
CREATE TABLE IF NOT EXISTS content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table (managed by connect-pg-simple)
CREATE TABLE IF NOT EXISTS "session" (
    "sid" VARCHAR NOT NULL COLLATE "default",
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,
    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- Add foreign key for primary_family_tree_id after family_trees exists
ALTER TABLE users
    ADD CONSTRAINT fk_users_primary_tree
    FOREIGN KEY (primary_family_tree_id)
    REFERENCES family_trees(id)
    ON DELETE SET NULL;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_persons_family_tree ON persons(family_tree_id);
CREATE INDEX IF NOT EXISTS idx_persons_user ON persons(user_id);
CREATE INDEX IF NOT EXISTS idx_persons_name ON persons(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_tree ON invites(tree_id);
CREATE INDEX IF NOT EXISTS idx_invites_status ON invites(status);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_family_tree_members_user ON family_tree_members(user_id);
CREATE INDEX IF NOT EXISTS idx_announcements_tree ON announcements(tree_id);
