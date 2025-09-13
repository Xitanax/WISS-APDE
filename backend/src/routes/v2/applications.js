// src/routes/v2/applications.js
import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

const requireAuth = (req, res, next) => req.user ? next() : res.status(401).json({ error: 'Missing token' });
const requireRole = (...roles) => (req, res, next) =>
  (req.user && roles.includes(req.user.role)) ? next() : res.status(403).json({ error: 'Forbidden' });

// APPLICANT: bewerben
router.post('/applications', requireAuth, requireRole('applicant'), async (req, res) => {
  const { jobId } = req.body || {};
  if (!jobId) return res.status(400).json({ error: 'jobId required' });
  try {
    const Application = mongoose.model('Application');
    const found = await Application.findOne({ job: jobId, applicant: req.user.id });
    if (found) return res.status(200).json(found);
    const created = await Application.create({ job: jobId, applicant: req.user.id });
    res.status(201).json(created);
  } catch (e) { console.error(e); res.status(500).json({ error: 'server error' }); }
});

// APPLICANT: meine Bewerbungen
router.get('/applications/me', requireAuth, requireRole('applicant'), async (req, res) => {
  try {
    const Application = mongoose.model('Application');
    const list = await Application.find({ applicant: req.user.id })
      .populate('job', 'title description')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (e) { console.error(e); res.status(500).json({ error: 'server error' }); }
});

// ADMIN/HR: alle (optional ?jobId=)
router.get('/applications', requireAuth, requireRole('admin', 'hr'), async (req, res) => {
  const { jobId } = req.query;
  const filter = jobId ? { job: jobId } : {};
  try {
    const Application = mongoose.model('Application');
    const list = await Application.find(filter)
      .populate('job', 'title')
      .populate('applicant', 'email')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (e) { console.error(e); res.status(500).json({ error: 'server error' }); }
});

// ADMIN/HR: Status ändern
router.patch('/applications/:id', requireAuth, requireRole('admin', 'hr'), async (req, res) => {
  const { status } = req.body || {};
  const allowed = ['submitted', 'in_review', 'rejected', 'accepted'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'invalid status' });
  try {
    const Application = mongoose.model('Application');
    const updated = await Application.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!updated) return res.status(404).json({ error: 'not found' });
    res.json(updated);
  } catch (e) { console.error(e); res.status(500).json({ error: 'server error' }); }
});

export default router;
