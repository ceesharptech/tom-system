const { verifyToken, ACCESS_SECRET } = require('../utils/jwt');

/**
 * Extract Bearer token from Authorization header, verify JWT, attach user to req.user.
 * Returns 401 if missing, invalid, or expired.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      error: true,
      message: 'Access token required',
      code: 'UNAUTHORIZED',
    });
  }

  const decoded = verifyToken(token, ACCESS_SECRET);
  if (!decoded || decoded.type !== 'access') {
    return res.status(401).json({
      error: true,
      message: 'Invalid or expired access token',
      code: 'UNAUTHORIZED',
    });
  }

  req.user = {
    id: decoded.id,
    officer_id: decoded.officer_id,
    email: decoded.email,
    role: decoded.role,
    full_name: decoded.full_name,
  };
  next();
}

module.exports = { authenticateToken };
