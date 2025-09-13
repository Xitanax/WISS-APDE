// src/routes/agency.js
import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

function getModelOrFail(name) {
  const m = mongoose.models[name];
  if (!m) throw new Error(`model_not_registered:${name}`);
  return m;
}

// Fallback-Definitionen nur wenn nicht vorhanden:
if (!mongoose.models.Agency) {
  const AgencySchema = new mongoose.Schema({
    name: { type: String, required: true },
    apiKey: { type: String, required: true, unique: true },
    active: { type: Boolean, default: true },
    permissions: { type: [String], default: ['jobs:read','applications:read'] },
  }, { timestamps: true });
  mongoose.model('Agency', AgencySchema);
}

// API-Key Middleware
async function agencyKeyAuth(req, res, next) {
  try {
    const Agency = getModelOrFail('Agency');
    const key = req.headers['x-api-key'];
    if (!key) return res.status(401).json({ error: 'missing_api_key' });
    const agency = await Agency.findOne({ apiKey: key, active: true });
    if (!agency) return res.status(401).json({ error: 'invalid_api_key' });
    req.agency = { id: String(agency._id), name: agency.name, permissions: agency.permissions };
    next();
  } catch (e) {
    console.error('[agency.auth] error', e.message);
    return res.status(500).json({ error: 'server_error', detail: String(e.message) });
  }
}

function needPerm(p) {
  return (req, res, next) => {
    if (!req.agency?.permissions?.includes(p)) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}

router.use(agencyKeyAuth);

// Jobs (offen)
router.get('/jobs', needPerm('jobs:read'), async (req, res) => {
  try {
    const Job = getModelOrFail('Job');
    const rows = await Job.find({ open: true }).sort({ createdAt: -1 });
    res.json(rows.map(j => ({
      id: String(j._id),
      title: j.title,
      description: j.description,
      linkedinPostId: j.linkedinPostId || null
    })));
  } catch (e) {
    console.error('[agency.jobs] error', e.message);
    return res.status(500).json({ error: 'server_error', detail: String(e.message) });
  }
});

// Bewerbungen (optional filter ?jobId=...)
router.get('/applications', needPerm('applications:read'), async (req, res) => {
  try {
    const { jobId } = req.query || {};
    const Application = getModelOrFail('Application');
    const rows = await Application
      .find(jobId ? { job: jobId } : {})
      .populate('job','title')
      .populate('applicant','email')
      .sort({ createdAt: -1 });

    res.json(rows.map(a => ({
      id: String(a._id),
      status: a.status,
      job: { id: String(a.job._id), title: a.job.title },
      applicant: { email: a.applicant.email },
      createdAt: a.createdAt
    })));
  } catch (e) {
    console.error('[agency.appl] error', e.message);
    return res.status(500).json({ error: 'server_error', detail: String(e.message) });
  }
});

export default router;
