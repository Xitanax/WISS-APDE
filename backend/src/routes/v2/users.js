// backend/src/routes/v2/users.js
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const router = Router();

// --- Auth-Middleware ---
function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
}

// --- Hilfsfunktion: bestehendes Model holen ---
function getUserModel() {
  if (mongoose.models.User) return mongoose.models.User;
  try { return mongoose.model('User'); } catch { /* not registered */ }
  return null;
}

// GET /api/v2/users  (admin)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const User = getUserModel();
  if (!User) return res.status(500).json({ error: 'User model not registered' });
  const docs = await User.find({}, { passwordHash: 0 }).sort({ createdAt: -1 }).lean();
  res.json(docs);
});

// POST /api/v2/users/create  (admin)
router.post('/create', requireAuth, requireAdmin, async (req, res) => {
  const User = getUserModel();
  if (!User) return res.status(500).json({ error: 'User model not registered' });

  const { email, password = 'secret123', role = 'applicant' } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });

  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ error: 'email exists' });

  const passwordHash = await bcrypt.hash(password, 10);
  const doc = await User.create({ email, passwordHash, role });
  res.status(201).json({ id: doc._id.toString(), email: doc.email, role: doc.role });
});

// DELETE /api/v2/users/:id  (admin)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const User = getUserModel();
  if (!User) return res.status(500).json({ error: 'User model not registered' });

  await User.deleteOne({ _id: req.params.id });
  res.json({ ok: true });
});

export default router;
