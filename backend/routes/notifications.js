const express = require('express');
const { load, transaction } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const data = load();
  const notifications = data.notifications
    .filter(n => n.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ notifications });
});

router.put('/:id/read', authenticate, async (req, res) => {
  const id = Number(req.params.id);
  const updated = await transaction(async data => {
    const n = data.notifications.find(x => x.id === id && x.userId === req.user.id);
    if (!n) return null;
    n.read = true;
    return n;
  });
  if (!updated) return res.status(404).json({ error: 'Notification not found' });
  res.json({ notification: updated });
});

router.put('/read-all', authenticate, async (req, res) => {
  await transaction(async data => {
    data.notifications.filter(n => n.userId === req.user.id).forEach(n => { n.read = true; });
  });
  res.json({ ok: true });
});

module.exports = router;
