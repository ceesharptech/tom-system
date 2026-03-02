/**
 * @param {string[]} allowedRoles - e.g. ['admin'] or ['officer', 'admin']
 * @returns {import('express').RequestHandler}
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: true,
        message: 'Insufficient permissions',
        code: 'FORBIDDEN',
      });
    }
    next();
  };
}

module.exports = { requireRole };
