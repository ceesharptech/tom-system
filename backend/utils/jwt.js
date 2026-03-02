const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || '30m';
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

/**
 * @param {{ id: string, officer_id: string, email: string, role: string, full_name?: string }} user
 * @returns {string}
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      officer_id: user.officer_id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      type: 'access',
    },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );
}

/**
 * @param {{ id: string }} user
 * @returns {string}
 */
function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES }
  );
}

/**
 * @param {string} token
 * @param {string} secret
 * @returns {object|null}
 */
function verifyToken(token, secret) {
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  ACCESS_SECRET,
  REFRESH_SECRET,
};
