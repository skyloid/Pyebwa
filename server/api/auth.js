// DEPRECATED: This file is kept for backwards compatibility.
// Use auth-secure.js instead, which has proper validation,
// rate limiting, and security logging.
//
// server.js and server-secure.js now both use auth-secure.js.

module.exports = require('./auth-secure');