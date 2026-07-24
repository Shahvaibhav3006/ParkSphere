const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { DATA_FILE } = require('./db');
const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/properties');
const slotRoutes = require('./routes/slots');
const { router: bookingRoutes } = require('./routes/bookings');
const paymentRoutes = require('./routes/payments');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Auto-seed on first run if no data file exists yet
if (!fs.existsSync(DATA_FILE)) {
  console.log('No data found — running initial seed...');
  require('./seed');
}

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'ParkSphere India API', time: new Date().toISOString() }));

// Serve frontend (static files)
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));
app.get('/{*splat}', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🚗 ParkSphere India backend running at http://localhost:${PORT}`);
  console.log(`   Frontend served from the same URL.\n`);
});
