const express = require('express');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { load, transaction, nextId } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * NOTE ON PAYMENTS
 * This demo simulates the Razorpay checkout flow (create order -> pay ->
 * verify) without hitting real payment servers, since no live API keys
 * are available in this environment. Swapping in the real Razorpay SDK
 * only requires replacing the two functions below.
 */

// Step 1: create a simulated payment order for a booking
router.post('/create-order', authenticate, authorize('customer'), async (req, res) => {
  const { bookingId } = req.body;
  const data = load();
  const booking = data.bookings.find(b => b.id === Number(bookingId) && b.userId === req.user.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status !== 'pending_payment') return res.status(409).json({ error: 'Booking is not awaiting payment' });

  const order = {
    orderId: 'order_' + uuidv4().replace(/-/g, '').slice(0, 14),
    bookingId: booking.id,
    amount: booking.amount,
    currency: 'INR'
  };
  res.json({ order });
});

// Step 2: simulate successful payment, confirm booking, generate QR
router.post('/verify', authenticate, authorize('customer'), async (req, res) => {
  const { bookingId, orderId } = req.body;
  if (!bookingId || !orderId) return res.status(400).json({ error: 'bookingId and orderId are required' });

  const result = await transaction(async data => {
    const booking = data.bookings.find(b => b.id === Number(bookingId) && b.userId === req.user.id);
    if (!booking) return { error: 'Booking not found' };
    if (booking.status !== 'pending_payment') return { error: 'Booking is not awaiting payment' };

    const payment = {
      id: nextId(data.payments),
      bookingId: booking.id,
      userId: req.user.id,
      orderId,
      paymentId: 'pay_' + uuidv4().replace(/-/g, '').slice(0, 14),
      amount: booking.amount,
      status: 'success',
      createdAt: new Date().toISOString()
    };
    data.payments.push(payment);
    booking.status = 'confirmed';

    data.notifications.push({
      id: nextId(data.notifications),
      userId: req.user.id,
      title: 'Payment successful',
      message: `₹${booking.amount} paid for booking ${booking.bookingRef}. Your QR code is ready.`,
      read: false,
      createdAt: new Date().toISOString()
    });
    data.activityLogs.push({ id: nextId(data.activityLogs), userId: req.user.id, action: 'PAYMENT_SUCCESS', details: `${booking.bookingRef} / ₹${booking.amount}`, createdAt: new Date().toISOString() });

    return { booking, payment };
  });

  if (result.error) return res.status(409).json({ error: result.error });

  const qrPayload = JSON.stringify({ ref: result.booking.bookingRef, slot: result.booking.slotId, vehicle: result.booking.vehicleNumber });
  const qrDataUrl = await QRCode.toDataURL(qrPayload);

  await transaction(async data => {
    const b = data.bookings.find(x => x.id === result.booking.id);
    if (b) b.qrCode = qrDataUrl;
  });

  res.json({ booking: { ...result.booking, qrCode: qrDataUrl }, payment: result.payment });
});

router.get('/history', authenticate, (req, res) => {
  const data = load();
  let payments = data.payments;
  if (req.user.role === 'customer') payments = payments.filter(p => p.userId === req.user.id);
  res.json({ payments });
});

module.exports = router;
