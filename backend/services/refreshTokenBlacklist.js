/**
 * In-memory blacklist for invalidated refresh tokens.
 * For production, use Redis or a database table.
 */
const blacklist = new Set();

function add(token) {
  blacklist.add(token);
}

function has(token) {
  return blacklist.has(token);
}

module.exports = { add, has };
