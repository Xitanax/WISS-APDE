// src/routes/public/register.js
import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    const User = mongoose.model('User');
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ error: 'email already registered' });
    const passwordHash = await bcrypt.hash(password, 10);
    const u = await User.create({ email: email.toLowerCase(), passwordHash, role: 'applicant' });
    res.status(201).json({ ok: true, id: u._id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

export default router;
