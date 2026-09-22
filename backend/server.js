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

/* =========================================================
   MIDDLEWARE
   ========================================================= */

app.use(cors());
app.use(express.json());

/* =========================================================
   AUTO-SEED DATABASE
   ========================================================= */

if (!fs.existsSync(DATA_FILE)) {
    console.log('No data found — running initial seed...');

    try {
        require('./seed');
    } catch (error) {
        console.error('Initial seed failed:', error);
    }
}

/* =========================================================
   API ROUTES
   ========================================================= */

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);

/* =========================================================
   HEALTH CHECK
   ========================================================= */

app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        service: 'ParkSphere India API',
        time: new Date().toISOString()
    });
});

/* =========================================================
   SERVE FRONTEND
   ========================================================= */

const frontendPath = path.join(__dirname, '..', 'frontend');

app.use(express.static(frontendPath));

/*
 * Frontend fallback.
 *
 * If the requested URL is not an API route,
 * send the main frontend page.
 */

app.get('/{*splat}', (req, res, next) => {

    if (req.path.startsWith('/api/')) {
        return next();
    }

    res.sendFile(path.join(frontendPath, 'index.html'));
});

/* =========================================================
   ERROR HANDLER
   ========================================================= */

app.use((err, req, res, next) => {

    console.error('Server Error:', err);

    res.status(500).json({
        error: 'Internal server error'
    });
});

/* =========================================================
   VERCEL EXPORT
   ========================================================= */

/*
 * Vercel needs access to the Express application.
 *
 * We export the app instead of always starting the server.
 */

module.exports = app;

/* =========================================================
   LOCAL DEVELOPMENT
   ========================================================= */

if (require.main === module) {

    app.listen(PORT, () => {

        console.log(
            `\n🚗 ParkSphere India backend running at http://localhost:${PORT}`
        );

        console.log(
            `   Frontend served from the same URL.\n`
        );

    });
}