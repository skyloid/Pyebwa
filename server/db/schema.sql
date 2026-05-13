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
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
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
    role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
    PRIMARY KEY (family_tree_id, user_id)
);

ALTER TABLE family_tree_members
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'viewer';

ALTER TABLE family_tree_members
    DROP CONSTRAINT IF EXISTS family_tree_members_role_check;

ALTER TABLE family_tree_members
    ADD CONSTRAINT family_tree_members_role_check CHECK (role IN ('owner', 'editor', 'viewer'));

UPDATE family_tree_members ftm
SET role = 'owner'
FROM family_trees ft
WHERE ftm.family_tree_id = ft.id
  AND ftm.user_id = ft.owner_id;

-- Persons (family tree entries - the actual people in the tree)
CREATE TABLE IF NOT EXISTS persons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_tree_id UUID NOT NULL REFERENCES family_trees(id) ON DELETE CASCADE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) DEFAULT '',
    nickname VARCHAR(255) DEFAULT '',
    use_nickname BOOLEAN DEFAULT false,
    birth_date DATE,
    death_date DATE,
    biography TEXT DEFAULT '',
    email VARCHAR(255),
    phone VARCHAR(50),
    gender VARCHAR(20),
    photos JSONB DEFAULT '[]',
    relationships JSONB DEFAULT '[]',
    events JSONB DEFAULT '[]',
    stories JSONB DEFAULT '[]',
    documents JSONB DEFAULT '[]',
    video_messages JSONB DEFAULT '[]',
    related_stories JSONB DEFAULT '[]',
    privacy JSONB DEFAULT '{}',
    search_terms JSONB DEFAULT '[]',
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    claimed_at TIMESTAMPTZ,
    claimed_via_invite BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE persons ADD COLUMN IF NOT EXISTS nickname VARCHAR(255) DEFAULT '';
ALTER TABLE persons ADD COLUMN IF NOT EXISTS use_nickname BOOLEAN DEFAULT false;
ALTER TABLE persons ADD COLUMN IF NOT EXISTS events JSONB DEFAULT '[]';
ALTER TABLE persons ADD COLUMN IF NOT EXISTS stories JSONB DEFAULT '[]';
ALTER TABLE persons ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]';
ALTER TABLE persons ADD COLUMN IF NOT EXISTS video_messages JSONB DEFAULT '[]';
ALTER TABLE persons ADD COLUMN IF NOT EXISTS related_stories JSONB DEFAULT '[]';
ALTER TABLE persons ADD COLUMN IF NOT EXISTS privacy JSONB DEFAULT '{}';

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

-- Public family discovery requests
CREATE TABLE IF NOT EXISTS discovery_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tree_id UUID NOT NULL REFERENCES family_trees(id) ON DELETE CASCADE,
    searched_surname VARCHAR(255) NOT NULL,
    requester_name VARCHAR(255) NOT NULL,
    requester_email VARCHAR(255) NOT NULL,
    requester_origin VARCHAR(255) DEFAULT '',
    requester_message TEXT DEFAULT '',
    requester_language VARCHAR(10) DEFAULT 'en',
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'contacted', 'invited', 'declined', 'archived')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
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
    DROP CONSTRAINT IF EXISTS fk_users_primary_tree;

ALTER TABLE users
    ADD CONSTRAINT fk_users_primary_tree
    FOREIGN KEY (primary_family_tree_id)
    REFERENCES family_trees(id)
    ON DELETE SET NULL;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

UPDATE users
SET status = 'active'
WHERE status IS NULL;

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_status_check;

ALTER TABLE users
    ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'suspended'));

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_persons_family_tree ON persons(family_tree_id);
CREATE INDEX IF NOT EXISTS idx_persons_user ON persons(user_id);
CREATE INDEX IF NOT EXISTS idx_persons_name ON persons(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_tree ON invites(tree_id);
CREATE INDEX IF NOT EXISTS idx_invites_status ON invites(status);
CREATE INDEX IF NOT EXISTS idx_discovery_requests_tree ON discovery_requests(tree_id);
CREATE INDEX IF NOT EXISTS idx_discovery_requests_status ON discovery_requests(status);
CREATE INDEX IF NOT EXISTS idx_discovery_requests_email ON discovery_requests(requester_email);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_family_tree_members_user ON family_tree_members(user_id);
CREATE INDEX IF NOT EXISTS idx_announcements_tree ON announcements(tree_id);

-- Supabase row-level security helpers and policies.
-- The Express API still performs authorization checks, but these policies protect
-- direct Supabase REST/storage access through the public anon/authenticated keys.
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        auth.jwt() -> 'user_metadata' ->> 'role',
        auth.jwt() -> 'app_metadata' ->> 'role',
        'member'
    );
$$;

CREATE OR REPLACE FUNCTION is_app_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT current_user_role() IN ('admin', 'superadmin');
$$;

CREATE OR REPLACE FUNCTION is_tree_member(target_tree_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM family_trees ft
        WHERE ft.id = target_tree_id
          AND ft.owner_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1
        FROM family_tree_members ftm
        WHERE ftm.family_tree_id = target_tree_id
          AND ftm.user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION is_tree_owner(target_tree_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM family_trees ft
        WHERE ft.id = target_tree_id
          AND ft.owner_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION is_tree_writer(target_tree_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM family_trees ft
        WHERE ft.id = target_tree_id
          AND ft.owner_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1
        FROM family_tree_members ftm
        WHERE ftm.family_tree_id = target_tree_id
          AND ftm.user_id = auth.uid()
          AND ftm.role IN ('owner', 'editor')
    );
$$;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_tree_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_own_or_admin ON users;
CREATE POLICY users_select_own_or_admin ON users
    FOR SELECT USING (id = auth.uid() OR is_app_admin());

DROP POLICY IF EXISTS users_update_own_limited ON users;
DROP POLICY IF EXISTS users_update_admin ON users;
CREATE POLICY users_update_admin ON users
    FOR UPDATE USING (is_app_admin())
    WITH CHECK (is_app_admin());

DROP POLICY IF EXISTS family_trees_select_member_or_public ON family_trees;
CREATE POLICY family_trees_select_member_or_public ON family_trees
    FOR SELECT USING (is_public = true OR is_tree_member(id) OR is_app_admin());

DROP POLICY IF EXISTS family_trees_insert_owner ON family_trees;
CREATE POLICY family_trees_insert_owner ON family_trees
    FOR INSERT WITH CHECK (owner_id = auth.uid() OR is_app_admin());

DROP POLICY IF EXISTS family_trees_update_writer ON family_trees;
CREATE POLICY family_trees_update_writer ON family_trees
    FOR UPDATE USING (is_tree_writer(id) OR is_app_admin())
    WITH CHECK (is_tree_writer(id) OR is_app_admin());

DROP POLICY IF EXISTS family_trees_delete_owner_or_admin ON family_trees;
CREATE POLICY family_trees_delete_owner_or_admin ON family_trees
    FOR DELETE USING (owner_id = auth.uid() OR is_app_admin());

DROP POLICY IF EXISTS family_tree_members_select_tree_member ON family_tree_members;
CREATE POLICY family_tree_members_select_tree_member ON family_tree_members
    FOR SELECT USING (is_tree_member(family_tree_id) OR is_app_admin());

DROP POLICY IF EXISTS family_tree_members_insert_writer ON family_tree_members;
DROP POLICY IF EXISTS family_tree_members_insert_owner ON family_tree_members;
CREATE POLICY family_tree_members_insert_owner ON family_tree_members
    FOR INSERT WITH CHECK (is_tree_owner(family_tree_id) OR is_app_admin());

DROP POLICY IF EXISTS family_tree_members_update_writer ON family_tree_members;
DROP POLICY IF EXISTS family_tree_members_update_owner ON family_tree_members;
CREATE POLICY family_tree_members_update_owner ON family_tree_members
    FOR UPDATE USING (is_tree_owner(family_tree_id) OR is_app_admin())
    WITH CHECK (is_tree_owner(family_tree_id) OR is_app_admin());

DROP POLICY IF EXISTS family_tree_members_delete_writer ON family_tree_members;
DROP POLICY IF EXISTS family_tree_members_delete_owner ON family_tree_members;
CREATE POLICY family_tree_members_delete_owner ON family_tree_members
    FOR DELETE USING (is_tree_owner(family_tree_id) OR is_app_admin());

DROP POLICY IF EXISTS persons_select_tree_member ON persons;
CREATE POLICY persons_select_tree_member ON persons
    FOR SELECT USING (is_tree_member(family_tree_id) OR is_app_admin());

DROP POLICY IF EXISTS persons_insert_tree_writer ON persons;
CREATE POLICY persons_insert_tree_writer ON persons
    FOR INSERT WITH CHECK (is_tree_writer(family_tree_id) OR is_app_admin());

DROP POLICY IF EXISTS persons_update_tree_writer ON persons;
CREATE POLICY persons_update_tree_writer ON persons
    FOR UPDATE USING (is_tree_writer(family_tree_id) OR is_app_admin())
    WITH CHECK (is_tree_writer(family_tree_id) OR is_app_admin());

DROP POLICY IF EXISTS persons_delete_tree_writer ON persons;
CREATE POLICY persons_delete_tree_writer ON persons
    FOR DELETE USING (is_tree_writer(family_tree_id) OR is_app_admin());

DROP POLICY IF EXISTS invites_select_tree_member ON invites;
CREATE POLICY invites_select_tree_member ON invites
    FOR SELECT USING (is_tree_member(tree_id) OR is_app_admin());

DROP POLICY IF EXISTS invites_insert_tree_writer ON invites;
CREATE POLICY invites_insert_tree_writer ON invites
    FOR INSERT WITH CHECK (is_tree_writer(tree_id) OR is_app_admin());

DROP POLICY IF EXISTS invites_update_tree_writer ON invites;
CREATE POLICY invites_update_tree_writer ON invites
    FOR UPDATE USING (is_tree_writer(tree_id) OR accepted_by = auth.uid() OR is_app_admin())
    WITH CHECK (is_tree_writer(tree_id) OR accepted_by = auth.uid() OR is_app_admin());

DROP POLICY IF EXISTS discovery_requests_select_tree_member ON discovery_requests;
CREATE POLICY discovery_requests_select_tree_member ON discovery_requests
    FOR SELECT USING (is_tree_member(tree_id) OR is_app_admin());

DROP POLICY IF EXISTS discovery_requests_insert_public ON discovery_requests;
CREATE POLICY discovery_requests_insert_public ON discovery_requests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM family_trees ft
            WHERE ft.id = tree_id
              AND COALESCE((ft.settings -> 'discovery' ->> 'enabled')::boolean, false) = true
        )
    );

DROP POLICY IF EXISTS discovery_requests_update_tree_writer ON discovery_requests;
CREATE POLICY discovery_requests_update_tree_writer ON discovery_requests
    FOR UPDATE USING (is_tree_writer(tree_id) OR is_app_admin())
    WITH CHECK (is_tree_writer(tree_id) OR is_app_admin());

DO $$
BEGIN
    IF to_regclass('storage.objects') IS NOT NULL THEN
        EXECUTE 'DROP POLICY IF EXISTS storage_photos_select_public ON storage.objects';
        EXECUTE 'CREATE POLICY storage_photos_select_public ON storage.objects FOR SELECT USING (bucket_id = ''photos'')';

        EXECUTE 'DROP POLICY IF EXISTS storage_photos_insert_owner_or_tree_writer ON storage.objects';
        EXECUTE 'CREATE POLICY storage_photos_insert_owner_or_tree_writer ON storage.objects FOR INSERT WITH CHECK (
            bucket_id = ''photos''
            AND (
                ((storage.foldername(name))[1] = ''users'' AND (storage.foldername(name))[2] = auth.uid()::text)
                OR (
                    (storage.foldername(name))[1] = ''trees''
                    AND (storage.foldername(name))[2] ~ ''^[0-9a-fA-F-]{36}$''
                    AND is_tree_writer(((storage.foldername(name))[2])::uuid)
                )
            )
        )';

        EXECUTE 'DROP POLICY IF EXISTS storage_photos_delete_owner_or_tree_writer ON storage.objects';
        EXECUTE 'CREATE POLICY storage_photos_delete_owner_or_tree_writer ON storage.objects FOR DELETE USING (
            bucket_id = ''photos''
            AND (
                ((storage.foldername(name))[1] = ''users'' AND (storage.foldername(name))[2] = auth.uid()::text)
                OR (
                    (storage.foldername(name))[1] = ''trees''
                    AND (storage.foldername(name))[2] ~ ''^[0-9a-fA-F-]{36}$''
                    AND is_tree_writer(((storage.foldername(name))[2])::uuid)
                )
            )
        )';
    END IF;
END $$;
