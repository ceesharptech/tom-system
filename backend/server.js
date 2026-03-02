require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const { authenticateToken } = require('./middleware/auth');
const { requireRole } = require('./middleware/roleCheck');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'ddits-backend',
      timestamp: new Date().toISOString(),
    },
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Test protected routes (for Phase 2 verification)
app.get('/api/test/officer', authenticateToken, requireRole(['officer', 'admin']), (req, res) => {
  res.json({ success: true, message: 'Officer or admin access granted', user: req.user });
});
app.get('/api/test/admin', authenticateToken, requireRole(['admin']), (req, res) => {
  res.json({ success: true, message: 'Admin access granted', user: req.user });
});

app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});
