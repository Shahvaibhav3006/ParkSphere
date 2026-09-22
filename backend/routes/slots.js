const express = require('express');
const { load, transaction } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Live parking map for a property (optionally filtered by floor)
router.get('/', authenticate, (req, res) => {
  const { propertyId, floor } = req.query;
  const data = load();
  let slots = data.slots;
  if (propertyId) slots = slots.filter(s => s.propertyId === Number(propertyId));
  if (floor) slots = slots.filter(s => s.floor === Number(floor));
  res.json({ slots });
});

router.put('/:id/status', authenticate, authorize('property_manager', 'super_admin', 'security_guard'), async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  const allowed = ['available', 'occupied', 'reserved', 'maintenance'];
  if (!allowed.includes(status)) return res.status(400).json({ error: `status must be one of ${allowed.join(', ')}` });

  const slot = await transaction(async data => {
    const s = data.slots.find(x => x.id === id);
    if (!s) return null;
    s.status = status;
    return s;
  });
  if (!slot) return res.status(404).json({ error: 'Slot not found' });
  res.json({ slot });
});

module.exports = router;
