const express = require('express');
const bcrypt = require('bcrypt');
const { supabase } = require('../services/supabase');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  REFRESH_SECRET,
} = require('../utils/jwt');
const { add: blacklistAdd, has: blacklistHas } = require('../services/refreshTokenBlacklist');

const router = express.Router();

/** Safe user shape (no password_hash) */
function toUser(row) {
  return {
    id: row.id,
    officer_id: row.officer_id,
    email: row.email,
    role: row.role,
    full_name: row.full_name ?? null,
  };
}

/**
 * Find user by identifier: if 6 digits, by officer_id; otherwise by email.
 */
async function findUserByIdentifier(identifier) {
  const isOfficerId = /^\d{6}$/.test(String(identifier).trim());
  const column = isOfficerId ? 'officer_id' : 'email';
  const value = String(identifier).trim();

  const { data, error } = await supabase
    .from('users')
    .select('id, officer_id, email, password_hash, role, full_name')
    .eq(column, value)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * POST /api/auth/login
 * Body: { identifier, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body ?? {};
    if (!identifier || !password) {
      return res.status(400).json({
        error: true,
        message: 'identifier and password are required',
        code: 'MISSING_FIELDS',
      });
    }

    const userRow = await findUserByIdentifier(identifier);
    if (!userRow) {
      return res.status(401).json({
        error: true,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    const match = await bcrypt.compare(password, userRow.password_hash);
    if (!match) {
      return res.status(401).json({
        error: true,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    const user = toUser(userRow);
    const accessToken = generateAccessToken(userRow);
    const refreshToken = generateRefreshToken(userRow);

    return res.json({
      success: true,
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      error: true,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * POST /api/auth/refresh
 * Body: { refreshToken }
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body ?? {};
    if (!refreshToken) {
      return res.status(401).json({
        error: true,
        message: 'Refresh token required',
        code: 'UNAUTHORIZED',
      });
    }

    if (blacklistHas(refreshToken)) {
      return res.status(401).json({
        error: true,
        message: 'Token has been revoked',
        code: 'UNAUTHORIZED',
      });
    }

    const decoded = verifyToken(refreshToken, REFRESH_SECRET);
    if (!decoded || decoded.type !== 'refresh') {
      return res.status(401).json({
        error: true,
        message: 'Invalid or expired refresh token',
        code: 'UNAUTHORIZED',
      });
    }

    const { data: userRow, error } = await supabase
      .from('users')
      .select('id, officer_id, email, role, full_name')
      .eq('id', decoded.id)
      .maybeSingle();

    if (error || !userRow) {
      return res.status(401).json({
        error: true,
        message: 'User not found',
        code: 'UNAUTHORIZED',
      });
    }

    const accessToken = generateAccessToken(userRow);
    return res.json({
      success: true,
      data: { accessToken },
    });
  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(500).json({
      error: true,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * POST /api/auth/logout
 * Body: { refreshToken }
 */
router.post('/logout', (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (refreshToken) {
    blacklistAdd(refreshToken);
  }
  return res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

module.exports = router;
