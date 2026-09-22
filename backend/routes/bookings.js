const express = require('express');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { load, transaction, nextId } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function computeAmount(pricePerHour, startTime, endTime) {
  const ms = new Date(endTime) - new Date(startTime);
  const hours = Math.max(1, Math.ceil(ms / (1000 * 60 * 60)));
  return { hours, amount: hours * pricePerHour };
}

// Create a booking (status starts 'pending_payment')
router.post('/', authenticate, authorize('customer'), async (req, res) => {
  const { propertyId, slotId, vehicleNumber, startTime, endTime } = req.body;
  if (!propertyId || !slotId || !vehicleNumber || !startTime || !endTime) {
    return res.status(400).json({ error: 'propertyId, slotId, vehicleNumber, startTime, endTime are required' });
  }

  const result = await transaction(async data => {
    const slot = data.slots.find(s => s.id === Number(slotId) && s.propertyId === Number(propertyId));
    if (!slot) return { error: 'Slot not found for this property' };
    if (slot.status !== 'available') return { error: `Slot ${slot.code} is not available (currently ${slot.status})` };

    const { hours, amount } = computeAmount(slot.pricePerHour, startTime, endTime);
    const booking = {
      id: nextId(data.bookings),
      bookingRef: uuidv4().split('-')[0].toUpperCase(),
      userId: req.user.id,
      propertyId: slot.propertyId,
      slotId: slot.id,
      vehicleNumber,
      startTime,
      endTime,
      hours,
      amount,
      status: 'pending_payment',
      qrCode: null,
      checkedInAt: null,
      checkedOutAt: null,
      createdAt: new Date().toISOString()
    };
    data.bookings.push(booking);
    slot.status = 'reserved';
    data.activityLogs.push({ id: nextId(data.activityLogs), userId: req.user.id, action: 'BOOKING_CREATED', details: `${booking.bookingRef} / slot ${slot.code}`, createdAt: new Date().toISOString() });
    return { booking };
  });

  if (result.error) return res.status(409).json({ error: result.error });
  res.status(201).json({ booking: result.booking });
});

// List bookings — customers see their own, staff see all (optionally filtered)
router.get('/', authenticate, (req, res) => {
  const data = load();
  let bookings = data.bookings;
  if (req.user.role === 'customer') {
    bookings = bookings.filter(b => b.userId === req.user.id);
  } else if (req.query.propertyId) {
    bookings = bookings.filter(b => b.propertyId === Number(req.query.propertyId));
  }
  res.json({ bookings });
});

router.get('/:id', authenticate, (req, res) => {
  const data = load();
  const booking = data.bookings.find(b => b.id === Number(req.params.id));
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (req.user.role === 'customer' && booking.userId !== req.user.id) {
    return res.status(403).json({ error: 'Not your booking' });
  }
  res.json({ booking });
});

// Security guard: scan/verify QR by booking ref, mark check-in or check-out
router.post('/:ref/scan', authenticate, authorize('security_guard', 'property_manager', 'super_admin'), async (req, res) => {
  const ref = req.params.ref.toUpperCase();
  const result = await transaction(async data => {
    const booking = data.bookings.find(b => b.bookingRef === ref);
    if (!booking) return { error: 'No booking found for this QR / reference code' };
    if (booking.status !== 'confirmed' && booking.status !== 'checked_in') {
      return { error: `Booking is '${booking.status}' — cannot scan` };
    }
    const slot = data.slots.find(s => s.id === booking.slotId);
    if (booking.status === 'confirmed') {
      booking.status = 'checked_in';
      booking.checkedInAt = new Date().toISOString();
      if (slot) slot.status = 'occupied';
    } else {
      booking.status = 'checked_out';
      booking.checkedOutAt = new Date().toISOString();
      if (slot) slot.status = 'available';
    }
    data.activityLogs.push({ id: nextId(data.activityLogs), userId: req.user.id, action: `BOOKING_${booking.status.toUpperCase()}`, details: booking.bookingRef, createdAt: new Date().toISOString() });
    return { booking };
  });
  if (result.error) return res.status(409).json({ error: result.error });
  res.json({ booking: result.booking });
});

// Find My Car — search by vehicle number
router.get('/find-car/:vehicleNumber', authenticate, (req, res) => {
  const vn = req.params.vehicleNumber.toUpperCase().replace(/\s/g, '');
  const data = load();
  const booking = data.bookings
    .filter(b => b.vehicleNumber.toUpperCase().replace(/\s/g, '') === vn && ['confirmed', 'checked_in'].includes(b.status))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  if (!booking) return res.status(404).json({ error: 'No active parking session found for this vehicle number' });
  const property = data.properties.find(p => p.id === booking.propertyId);
  const slot = data.slots.find(s => s.id === booking.slotId);
  res.json({
    vehicleNumber: booking.vehicleNumber,
    property: property ? property.name : 'Unknown',
    floor: slot ? slot.floor : null,
    slotCode: slot ? slot.code : null,
    status: booking.status,
    checkedInAt: booking.checkedInAt
  });
});

module.exports = { router, generateQrDataUrl: (text) => QRCode.toDataURL(text) };
