-- Add first_name and last_name columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Update existing users with names from planter_profiles
UPDATE users u
SET 
  first_name = pp.first_name,
  last_name = pp.last_name
FROM planter_profiles pp
WHERE u.id = pp.user_id;

-- Update existing users with names from family_profiles (use family_name for first_name)
UPDATE users u
SET 
  first_name = fp.family_name
FROM family_profiles fp
WHERE u.id = fp.user_id
AND u.first_name IS NULL;

-- Add comment to columns
COMMENT ON COLUMN users.first_name IS 'User''s first name';
COMMENT ON COLUMN users.last_name IS 'User''s last name';