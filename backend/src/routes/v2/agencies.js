// src/routes/v2/agencies.js
import express from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { requireAuth, requireRole } from '../../lib/auth.js';

const router = express.Router();

// Model nur definieren, wenn nicht vorhanden
if (!mongoose.models.Agency) {
  const AgencySchema = new mongoose.Schema({
    name: { type: String, required: true },
    apiKey: { type: String, required: true, unique: true, index: true },
    active: { type: Boolean, default: true },
    permissions: { type: [String], default: ['jobs:read','applications:read'] },
  }, { timestamps: true });
  mongoose.model('Agency', AgencySchema);
}
const Agency = mongoose.models.Agency;

// Hilfsfunktion
function randomKey() {
  return crypto.randomBytes(24).toString('hex');
}

// Anlegen
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { name, permissions } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name_required' });
    const apiKey = randomKey();
    const doc = await Agency.create({
      name,
      apiKey,
      permissions: Array.isArray(permissions) && permissions.length ? permissions : undefined,
    });
    res.json({ ok: true, id: String(doc._id), apiKey: doc.apiKey });
  } catch (e) {
    console.error('[agencies.create] error', e.message);
    res.status(500).json({ error: 'server_error', detail: String(e.message) });
  }
});

// Auflisten
router.get('/', requireAuth, requireRole('admin'), async (_req, res) => {
  const rows = await Agency.find().sort({ createdAt: -1 });
  res.json(rows.map(a => ({
    id: String(a._id),
    name: a.name,
    active: a.active,
    permissions: a.permissions,
    createdAt: a.createdAt
  })));
});

// De-/aktivieren
router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { active, permissions } = req.body || {};
    const a = await Agency.findById(req.params.id);
    if (!a) return res.status(404).json({ error: 'not_found' });
    if (typeof active === 'boolean') a.active = active;
    if (Array.isArray(permissions)) a.permissions = permissions;
    await a.save();
    res.json({ ok: true, id: String(a._id), active: a.active, permissions: a.permissions });
  } catch (e) {
    console.error('[agencies.patch] error', e.message);
    res.status(500).json({ error: 'server_error', detail: String(e.message) });
  }
});

export default router;
