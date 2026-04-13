const { createClient } = require('@supabase/supabase-js');
const {
    getSupabaseUrl,
    getSupabaseServiceRoleKey
} = require('./pyebwa-supabase-config');

const supabaseUrl = getSupabaseUrl();
const supabaseServiceKey = getSupabaseServiceRoleKey();

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
}

// Admin client with service_role key - for server-side operations
const supabaseAdmin = createClient(supabaseUrl || '', supabaseServiceKey || '', {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

module.exports = { supabaseAdmin };
