const express = require('express');
const bcrypt = require('bcryptjs');
const { load, transaction, nextId } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function publicUser(u) { const { password, ...rest } = u; return rest; }

router.get('/', authenticate, authorize('super_admin'), (req, res) => {
  const data = load();
  res.json({ users: data.users.map(publicUser) });
});

router.post('/', authenticate, authorize('super_admin'), async (req, res) => {
  const { name, email, password, role, propertyId } = req.body;
  const allowedRoles = ['super_admin', 'property_manager', 'security_guard', 'customer'];
  if (!name || !email || !password || !allowedRoles.includes(role)) {
    return res.status(400).json({ error: `name, email, password, and a valid role (${allowedRoles.join(', ')}) are required` });
  }
  const result = await transaction(async data => {
    if (data.users.some(u => u.email.toLowerCase() === email.toLowerCase())) return { error: 'Email already in use' };
    const user = { id: nextId(data.users), name, email, password: bcrypt.hashSync(password, 8), role, propertyId: propertyId || null, vehicleNumber: null };
    data.users.push(user);
    data.activityLogs.push({ id: nextId(data.activityLogs), userId: req.user.id, action: 'STAFF_USER_CREATED', details: `${email} (${role})`, createdAt: new Date().toISOString() });
    return { user };
  });
  if (result.error) return res.status(409).json({ error: result.error });
  res.status(201).json({ user: publicUser(result.user) });
});

router.get('/activity-logs', authenticate, authorize('super_admin', 'property_manager'), (req, res) => {
  const data = load();
  const logs = data.activityLogs.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 200);
  res.json({ logs });
});

module.exports = router;
