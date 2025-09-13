// src/routes/v2/account.js
import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();
const requireAuth = (req, res, next) => req.user ? next() : res.status(401).json({ error: 'Missing token' });
const requireRole = (...roles) => (req, res, next) =>
  (req.user && roles.includes(req.user.role)) ? next() : res.status(403).json({ error: 'Forbidden' });

router.post('/account/request-deletion', requireAuth, requireRole('applicant'), async (req, res) => {
  const User = mongoose.model('User');
  const now = new Date();
  const due = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  try {
    await User.findByIdAndUpdate(req.user.id, { deletionRequestedAt: now, deletionDueAt: due });
    res.json({ ok: true, deletionDueAt: due });
  } catch (e) { console.error(e); res.status(500).json({ error: 'server error' }); }
});

export default router;
