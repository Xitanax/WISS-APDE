import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireJWT } from '../middleware/jwt.js';

const router = Router();

// POST /api/auth/bootstrap-admin  (Header: x-bootstrap-secret)
router.post('/bootstrap-admin', async (req, res) => {
  try {
    const secret = req.header('x-bootstrap-secret');
    if (!secret || secret !== process.env.BOOTSTRAP_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const email = process.env.ADMIN_EMAIL || 'admin@chocadies.local';
    const password = process.env.ADMIN_PASSWORD || 'secret123';

    let existing = await User.findOne({ email });
    if (existing) {
      return res.status(200).json({
        ok: true,
        user: { id: existing._id, email: existing.email, role: existing.role }
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, role: 'admin' });
    return res.status(201).json({
      ok: true,
      user: { id: user._id, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('[bootstrap-admin] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/auth/register  {email, password}
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Bad request' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'User exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, role: 'applicant' });
    res.status(201).json({ ok: true, id: user._id });
  } catch (err) {
    console.error('[register] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/auth/login  {email, password}
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Bad request' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token });
  } catch (err) {
    console.error('[login] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/auth/me (JWT)
router.get('/me', requireJWT(), async (req, res) => {
  res.json({ email: req.user.email, role: req.user.role });
});

export default router;
