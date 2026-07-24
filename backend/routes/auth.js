const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { transaction, nextId } = require('../db');
const { JWT_SECRET, authenticate } = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, propertyId: user.propertyId },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function publicUser(u) {
  const { password, ...rest } = u;
  return rest;
}

router.post('/register', async (req, res) => {
  const { name, email, password, vehicleNumber } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }
  const result = await transaction(async data => {
    if (data.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { error: 'An account with this email already exists' };
    }
    const user = {
      id: nextId(data.users),
      name,
      email,
      password: bcrypt.hashSync(password, 8),
      role: 'customer',
      propertyId: null,
      vehicleNumber: vehicleNumber || null
    };
    data.users.push(user);
    data.notifications.push({
      id: nextId(data.notifications),
      userId: user.id,
      title: 'Welcome to ParkSphere India',
      message: 'Your account has been created successfully.',
      read: false,
      createdAt: new Date().toISOString()
    });
    data.activityLogs.push({ id: nextId(data.activityLogs), userId: user.id, action: 'USER_REGISTERED', details: email, createdAt: new Date().toISOString() });
    return { user };
  });

  if (result.error) return res.status(409).json({ error: result.error });
  const token = signToken(result.user);
  res.status(201).json({ token, user: publicUser(result.user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const { load } = require('../db');
  const data = load();
  const user = data.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

router.get('/me', authenticate, (req, res) => {
  const { load } = require('../db');
  const data = load();
  const user = data.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
});

module.exports = router;
