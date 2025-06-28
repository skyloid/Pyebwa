-- User Activity Tracking Migration
-- This migration adds tables for comprehensive user activity monitoring

-- User Activities Table
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID,
    action VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('authentication', 'transaction', 'planting', 'verification', 'admin', 'navigation')),
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    duration INTEGER, -- Duration in milliseconds
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    ip_address INET NOT NULL,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}',
    location JSONB DEFAULT '{}',
    activity_count INTEGER DEFAULT 0,
    pages_visited JSONB DEFAULT '[]',
    duration INTEGER DEFAULT 0, -- Duration in milliseconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Suspicious Activities Table
CREATE TABLE IF NOT EXISTS suspicious_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    suspicion_type VARCHAR(50) NOT NULL CHECK (suspicion_type IN (
        'multiple_logins', 'unusual_location', 'rapid_actions', 
        'failed_authentications', 'bot_behavior', 'fraud_indicators'
    )),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'investigating', 'resolved', 'false_positive')),
    investigated_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin Actions Log Table
CREATE TABLE IF NOT EXISTS admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id UUID,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Page Views Table (for detailed navigation tracking)
CREATE TABLE IF NOT EXISTS page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
    page_url VARCHAR(500) NOT NULL,
    page_title VARCHAR(200),
    referrer VARCHAR(500),
    time_on_page INTEGER, -- Time spent on page in milliseconds
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Activity Analytics View
CREATE OR REPLACE VIEW user_activity_analytics AS
SELECT 
    DATE_TRUNC('hour', ua.timestamp) as hour,
    COUNT(*) as total_activities,
    COUNT(DISTINCT ua.user_id) as unique_users,
    COUNT(CASE WHEN ua.success THEN 1 END) as successful_activities,
    COUNT(CASE WHEN NOT ua.success THEN 1 END) as failed_activities,
    ua.category,
    u.user_type
FROM user_activities ua
JOIN users u ON ua.user_id = u.id
WHERE ua.timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', ua.timestamp), ua.category, u.user_type
ORDER BY hour DESC;

-- User Session Analytics View
CREATE OR REPLACE VIEW user_session_analytics AS
SELECT 
    DATE_TRUNC('day', us.start_time) as day,
    COUNT(*) as total_sessions,
    COUNT(DISTINCT us.user_id) as unique_users,
    AVG(us.duration) as avg_session_duration,
    AVG(us.activity_count) as avg_activities_per_session,
    COUNT(CASE WHEN us.activity_count = 1 THEN 1 END) as bounce_sessions,
    u.user_type
FROM user_sessions us
JOIN users u ON us.user_id = u.id
WHERE us.start_time >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', us.start_time), u.user_type
ORDER BY day DESC;

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_timestamp ON user_activities(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_activities_category ON user_activities(category);
CREATE INDEX IF NOT EXISTS idx_user_activities_action ON user_activities(action);
CREATE INDEX IF NOT EXISTS idx_user_activities_success ON user_activities(success);
CREATE INDEX IF NOT EXISTS idx_user_activities_session_id ON user_activities(session_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_start_time ON user_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);

CREATE INDEX IF NOT EXISTS idx_suspicious_activities_user_id ON suspicious_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_detected_at ON suspicious_activities(detected_at);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_severity ON suspicious_activities(severity);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_status ON suspicious_activities(status);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_timestamp ON admin_actions(timestamp);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action ON admin_actions(action);

CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_timestamp ON page_views(timestamp);

-- Add last_login column to users table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'last_login') THEN
        ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Function to update session activity
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Update session last activity and activity count
    UPDATE user_sessions 
    SET 
        last_activity = NEW.timestamp,
        activity_count = activity_count + 1,
        duration = EXTRACT(EPOCH FROM (NEW.timestamp - start_time)) * 1000
    WHERE id = NEW.session_id AND is_active = true;
    
    -- Update user last login if it's an authentication activity
    IF NEW.category = 'authentication' AND NEW.success = true THEN
        UPDATE users SET last_login = NEW.timestamp WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update session activity
DROP TRIGGER IF EXISTS trigger_update_session_activity ON user_activities;
CREATE TRIGGER trigger_update_session_activity
    AFTER INSERT ON user_activities
    FOR EACH ROW
    WHEN (NEW.session_id IS NOT NULL)
    EXECUTE FUNCTION update_session_activity();

-- Function to detect suspicious activities
CREATE OR REPLACE FUNCTION detect_suspicious_activity()
RETURNS TRIGGER AS $$
DECLARE
    recent_failed_logins INTEGER;
    recent_rapid_actions INTEGER;
    different_locations INTEGER;
BEGIN
    -- Check for multiple failed login attempts
    IF NEW.category = 'authentication' AND NEW.success = false THEN
        SELECT COUNT(*) INTO recent_failed_logins
        FROM user_activities
        WHERE user_id = NEW.user_id
        AND category = 'authentication'
        AND success = false
        AND timestamp >= NOW() - INTERVAL '15 minutes';
        
        IF recent_failed_logins >= 5 THEN
            INSERT INTO suspicious_activities (
                user_id, suspicion_type, severity, description, details
            ) VALUES (
                NEW.user_id, 
                'failed_authentications', 
                'high',
                'Multiple failed login attempts detected',
                jsonb_build_object(
                    'failed_attempts', recent_failed_logins,
                    'time_window', '15 minutes'
                )
            );
        END IF;
    END IF;
    
    -- Check for rapid actions (potential bot behavior)
    SELECT COUNT(*) INTO recent_rapid_actions
    FROM user_activities
    WHERE user_id = NEW.user_id
    AND timestamp >= NOW() - INTERVAL '1 minute';
    
    IF recent_rapid_actions >= 20 THEN
        INSERT INTO suspicious_activities (
            user_id, suspicion_type, severity, description, details
        ) VALUES (
            NEW.user_id,
            'rapid_actions',
            'medium',
            'Unusually rapid activity detected',
            jsonb_build_object(
                'actions_count', recent_rapid_actions,
                'time_window', '1 minute'
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically detect suspicious activities
DROP TRIGGER IF EXISTS trigger_detect_suspicious_activity ON user_activities;
CREATE TRIGGER trigger_detect_suspicious_activity
    AFTER INSERT ON user_activities
    FOR EACH ROW
    EXECUTE FUNCTION detect_suspicious_activity();

-- Function to cleanup old data
CREATE OR REPLACE FUNCTION cleanup_old_activity_data()
RETURNS void AS $$
BEGIN
    -- Clean up old user activities (keep last 90 days)
    DELETE FROM user_activities WHERE timestamp < NOW() - INTERVAL '90 days';
    
    -- Clean up old page views (keep last 30 days)
    DELETE FROM page_views WHERE timestamp < NOW() - INTERVAL '30 days';
    
    -- Clean up old inactive sessions (keep last 30 days)
    DELETE FROM user_sessions 
    WHERE is_active = false AND end_time < NOW() - INTERVAL '30 days';
    
    -- Update session durations for active sessions
    UPDATE user_sessions 
    SET 
        duration = EXTRACT(EPOCH FROM (last_activity - start_time)) * 1000
    WHERE is_active = true;
    
    -- Mark sessions as inactive if no activity for 1 hour
    UPDATE user_sessions 
    SET 
        is_active = false,
        end_time = last_activity
    WHERE is_active = true 
    AND last_activity < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job to cleanup old data (if pg_cron is available)
-- SELECT cron.schedule('cleanup-activity-data', '0 2 * * *', 'SELECT cleanup_old_activity_data();');

-- Insert some sample data for testing (remove in production)
-- INSERT INTO user_activities (user_id, action, category, description, success, ip_address) 
-- SELECT 
--     id, 
--     'login', 
--     'authentication', 
--     'User logged in successfully',
--     true,
--     '192.168.1.1'::inet
-- FROM users LIMIT 5;

COMMENT ON TABLE user_activities IS 'Tracks all user actions and interactions with the platform';
COMMENT ON TABLE user_sessions IS 'Manages user session data including device info and activity tracking';
COMMENT ON TABLE suspicious_activities IS 'Logs suspicious user behavior for security monitoring';
COMMENT ON TABLE admin_actions IS 'Audit log for all administrative actions';
COMMENT ON TABLE page_views IS 'Detailed page navigation tracking for analytics';

-- Grant permissions to application user (adjust role name as needed)
-- GRANT SELECT, INSERT, UPDATE ON user_activities TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON user_sessions TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON suspicious_activities TO app_user;
-- GRANT SELECT, INSERT ON admin_actions TO app_user;
-- GRANT SELECT, INSERT ON page_views TO app_user;