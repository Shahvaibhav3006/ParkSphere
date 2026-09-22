const express = require('express');
const { load, transaction, nextId } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const data = load();
  res.json({ properties: data.properties });
});

router.post('/', authenticate, authorize('super_admin'), async (req, res) => {
  const { name, type, city, floors, slotsPerFloor } = req.body;
  if (!name || !type || !city || !floors || !slotsPerFloor) {
    return res.status(400).json({ error: 'name, type, city, floors, slotsPerFloor are required' });
  }
  const property = await transaction(async data => {
    const p = { id: nextId(data.properties), name, type, city, floors: Number(floors), slotsPerFloor: Number(slotsPerFloor) };
    data.properties.push(p);
    let sid = nextId(data.slots);
    for (let f = 1; f <= p.floors; f++) {
      for (let s = 1; s <= p.slotsPerFloor; s++) {
        data.slots.push({ id: sid++, propertyId: p.id, floor: f, code: `F${f}-${String(s).padStart(2, '0')}`, status: 'available', type: 'standard', pricePerHour: 15 });
      }
    }
    data.activityLogs.push({ id: nextId(data.activityLogs), userId: req.user.id, action: 'PROPERTY_CREATED', details: p.name, createdAt: new Date().toISOString() });
    return p;
  });
  res.status(201).json({ property });
});

router.put('/:id', authenticate, authorize('super_admin'), async (req, res) => {
  const id = Number(req.params.id);
  const updated = await transaction(async data => {
    const p = data.properties.find(x => x.id === id);
    if (!p) return null;
    Object.assign(p, req.body);
    return p;
  });
  if (!updated) return res.status(404).json({ error: 'Property not found' });
  res.json({ property: updated });
});

module.exports = router;
