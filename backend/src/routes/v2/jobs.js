// backend/src/routes/v2/jobs.js
import { Router } from 'express';
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
function requireAdminOrHr(req, res, next) {
  if (!req.user || !['admin', 'hr'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  next();
}

// --- Hilfsfunktion: bestehendes Model holen ---
function getJobModel() {
  if (mongoose.models.Job) return mongoose.models.Job;
  try { return mongoose.model('Job'); } catch { /* not registered */ }
  return null;
}

// GET /api/v2/jobs (admin/hr)
router.get('/', requireAuth, requireAdminOrHr, async (req, res) => {
  const Job = getJobModel();
  if (!Job) return res.status(500).json({ error: 'Job model not registered' });
  const docs = await Job.find({}).sort({ createdAt: -1 }).lean();
  res.json(
    docs.map(doc => ({
      id: doc._id.toString(),
      title: doc.title,
      shortDescription: doc.shortDescription || doc.description || '',
      description: doc.description,
      open: doc.open,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      linkedinPostId: doc.linkedinPostId || null
    }))
  );
});

// POST /api/v2/jobs (admin/hr)
router.post('/', requireAuth, requireAdminOrHr, async (req, res) => {
  const Job = getJobModel();
  if (!Job) return res.status(500).json({ error: 'Job model not registered' });

  const { title, shortDescription = '', description = '', open = true } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title required' });

  const doc = await Job.create({ title, shortDescription, description, open });
  res.status(201).json({
    id: doc._id.toString(),
    title: doc.title,
    shortDescription: doc.shortDescription,
    description: doc.description,
    open: doc.open
  });
});

// PATCH /api/v2/jobs/:id (admin/hr)
router.patch('/:id', requireAuth, requireAdminOrHr, async (req, res) => {
  const Job = getJobModel();
  if (!Job) return res.status(500).json({ error: 'Job model not registered' });

  const update = {};
  ['title', 'shortDescription', 'description', 'open'].forEach(k => { if (k in req.body) update[k] = req.body[k]; });

  const doc = await Job.findByIdAndUpdate(req.params.id, update, { new: true, lean: true });
  if (!doc) return res.status(404).json({ error: 'not found' });
  res.json({
    id: doc._id,
    title: doc.title,
    shortDescription: doc.shortDescription || doc.description || '',
    description: doc.description,
    open: doc.open
  });
});

// DELETE /api/v2/jobs/:id (admin/hr)
router.delete('/:id', requireAuth, requireAdminOrHr, async (req, res) => {
  const Job = getJobModel();
  if (!Job) return res.status(500).json({ error: 'Job model not registered' });

  await Job.deleteOne({ _id: req.params.id });
  res.json({ ok: true });
});

export default router;
