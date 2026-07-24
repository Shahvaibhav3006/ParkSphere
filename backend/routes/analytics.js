const express = require('express');
const { load } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/summary', authenticate, authorize('property_manager', 'super_admin'), (req, res) => {
  const data = load();
  const propertyId = req.query.propertyId ? Number(req.query.propertyId) : (req.user.role === 'property_manager' ? req.user.propertyId : null);

  let slots = data.slots;
  let bookings = data.bookings;
  let payments = data.payments;
  if (propertyId) {
    slots = slots.filter(s => s.propertyId === propertyId);
    bookings = bookings.filter(b => b.propertyId === propertyId);
    const bIds = new Set(bookings.map(b => b.id));
    payments = payments.filter(p => bIds.has(p.bookingId));
  }

  const occupancy = {
    total: slots.length,
    available: slots.filter(s => s.status === 'available').length,
    occupied: slots.filter(s => s.status === 'occupied').length,
    reserved: slots.filter(s => s.status === 'reserved').length,
    maintenance: slots.filter(s => s.status === 'maintenance').length
  };

  const revenue = payments.reduce((sum, p) => sum + p.amount, 0);

  const bookingsByDay = {};
  bookings.forEach(b => {
    const day = b.createdAt.slice(0, 10);
    bookingsByDay[day] = (bookingsByDay[day] || 0) + 1;
  });

  const hourCounts = new Array(24).fill(0);
  bookings.forEach(b => {
    const h = new Date(b.startTime).getHours();
    if (!isNaN(h)) hourCounts[h]++;
  });
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

  const slotUsage = {};
  bookings.forEach(b => { slotUsage[b.slotId] = (slotUsage[b.slotId] || 0) + 1; });
  const mostUsedSlots = Object.entries(slotUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([slotId, count]) => {
      const slot = data.slots.find(s => s.id === Number(slotId));
      return { slotCode: slot ? slot.code : slotId, count };
    });

  res.json({
    occupancy,
    revenue,
    totalBookings: bookings.length,
    bookingsByDay,
    peakHour,
    mostUsedSlots
  });
});

module.exports = router;
