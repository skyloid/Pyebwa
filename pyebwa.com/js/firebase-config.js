// Supabase configuration (replaces Firebase)
// pyebwa.com marketing site - auth handled on rasin.pyebwa.com
console.log('[pyebwa.com] Auth handled on rasin.pyebwa.com - Firebase removed');

// Stub globals to prevent errors from any lingering references
window.auth = {
    currentUser: null,
    onAuthStateChanged: function(cb) { cb(null); },
    signOut: function() { return Promise.resolve(); }
};
window.db = {
    collection: function() {
        return {
            doc: function() { return { get: function() { return Promise.resolve({ exists: false }); } }; }
        };
    }
};
