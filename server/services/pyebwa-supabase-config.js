function trimTrailingSlash(value) {
    return String(value || '').replace(/\/+$/, '');
}

function getSiteUrl() {
    return trimTrailingSlash(
        process.env.PYEBWA_SITE_URL
        || process.env.SITE_URL
        || 'https://rasin.pyebwa.com'
    );
}

function getSupabaseUrl() {
    return trimTrailingSlash(
        process.env.PYEBWA_SUPABASE_URL
        || process.env.SUPABASE_URL
        || ''
    );
}

function getSupabaseAnonKey() {
    return String(
        process.env.PYEBWA_SUPABASE_ANON_KEY
        || process.env.SUPABASE_ANON_KEY
        || ''
    ).trim();
}

function getSupabaseServiceRoleKey() {
    return String(
        process.env.PYEBWA_SUPABASE_SERVICE_ROLE_KEY
        || process.env.SUPABASE_SERVICE_ROLE_KEY
        || ''
    ).trim();
}

function getAuthExternalUrl() {
    return trimTrailingSlash(
        process.env.PYEBWA_AUTH_EXTERNAL_URL
        || process.env.AUTH_EXTERNAL_URL
        || `${getSiteUrl()}/supabase`
    );
}

function getSupabaseAuthAdminUrl() {
    return trimTrailingSlash(
        process.env.PYEBWA_SUPABASE_AUTH_ADMIN_URL
        || process.env.SUPABASE_AUTH_ADMIN_URL
        || 'http://127.0.0.1:9998'
    );
}

function getSupabaseAuthJwtSecret() {
    return String(
        process.env.PYEBWA_SUPABASE_AUTH_JWT_SECRET
        || process.env.SUPABASE_AUTH_JWT_SECRET
        || ''
    ).trim();
}

module.exports = {
    getSiteUrl,
    getSupabaseUrl,
    getSupabaseAnonKey,
    getSupabaseServiceRoleKey,
    getAuthExternalUrl,
    getSupabaseAuthAdminUrl,
    getSupabaseAuthJwtSecret
};
