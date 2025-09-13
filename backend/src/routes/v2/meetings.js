// src/routes/v2/meetings.js
import express from 'express';
import mongoose from 'mongoose';
import { requireAuth, requireRole } from '../../lib/auth.js';

const router = express.Router();

function getModelOrFail(name) {
  const m = mongoose.models[name];
  if (!m) throw new Error(`model_not_registered:${name}`);
  return m;
}

// Meeting-Model hier robust definieren (nur wenn nicht vorhanden)
const MeetingSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hr: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: String, enum: ['applicant','hr','admin'], required: true },
  startsAt: { type: Date, required: true },
  endsAt:   { type: Date, required: true },
  mode:     { type: String, enum: ['onsite','online','phone'], default: 'online' },
  location: { type: String, default: '' },
  status:   { type: String, enum: ['proposed','accepted','declined','canceled'], default: 'proposed' },
  notes:    { type: String, default: '' },
}, { timestamps: true });

const Meeting = mongoose.models.Meeting || mongoose.model('Meeting', MeetingSchema);

// Helper
async function getUserByEmail(email) {
  const User = getModelOrFail('User');
  return User.findOne({ email });
}

// Meeting anlegen
router.post('/', requireAuth, async (req, res) => {
  try {
    const { jobId, startsAt, endsAt, mode, location, applicantEmail } = req.body || {};
    if (!jobId || !startsAt || !endsAt) return res.status(400).json({ error: 'jobId_startsAt_endsAt_required' });

    const Job = getModelOrFail('Job');
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: 'job_not_found' });

    const creatorRole = req.user.role;
    let applicantUser, hrUser;

    if (creatorRole === 'applicant') {
      applicantUser = await getUserByEmail(req.user.email);
      const User = getModelOrFail('User');
      hrUser = await User.findOne({ role: { $in: ['hr','admin'] } });
    } else if (creatorRole === 'hr' || creatorRole === 'admin') {
      if (!applicantEmail) return res.status(400).json({ error: 'applicantEmail_required_for_hr' });
      const User = getModelOrFail('User');
      applicantUser = await User.findOne({ email: applicantEmail });
      if (!applicantUser) return res.status(404).json({ error: 'applicant_not_found' });
      hrUser = await getUserByEmail(req.user.email);
    } else {
      return res.status(403).json({ error: 'forbidden' });
    }

    const doc = await Meeting.create({
      job: job._id,
      applicant: applicantUser._id,
      hr: hrUser._id,
      createdBy: creatorRole,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      mode: mode || 'online',
      location: location || '',
      status: 'proposed',
    });

    return res.json({ ok: true, id: String(doc._id), status: doc.status });
  } catch (e) {
    console.error('[meetings.create] error', e.message);
    return res.status(500).json({ error: 'server_error', detail: String(e.message) });
  }
});

// Eigene Meetings
router.get('/me', requireAuth, async (req, res) => {
  try {
    const me = await getUserByEmail(req.user.email);
    if (!me) return res.status(401).json({ error: 'Invalid token' });

    const query = (req.user.role === 'applicant') ? { applicant: me._id } : { hr: me._id };
    const rows = await Meeting.find(query).populate('job','title').sort({ createdAt: -1 });
    return res.json(rows.map(m => ({
      id: String(m._id),
      status: m.status,
      startsAt: m.startsAt,
      endsAt: m.endsAt,
      mode: m.mode,
      location: m.location,
      job: { id: String(m.job._id), title: m.job.title },
    })));
  } catch (e) {
    console.error('[meetings.me] error', e.message);
    return res.status(500).json({ error: 'server_error', detail: String(e.message) });
  }
});

// HR/Admin: Meetings zu Job
router.get('/', requireAuth, requireRole('hr','admin'), async (req, res) => {
  try {
    const { jobId } = req.query;
    if (!jobId) return res.status(400).json({ error: 'jobId_required' });
    const rows = await Meeting.find({ job: jobId }).populate('applicant','email').sort({ createdAt: -1 });
    return res.json(rows.map(m => ({
      id: String(m._id),
      status: m.status,
      startsAt: m.startsAt,
      endsAt: m.endsAt,
      mode: m.mode,
      location: m.location,
      applicant: { email: m.applicant.email },
    })));
  } catch (e) {
    console.error('[meetings.list] error', e.message);
    return res.status(500).json({ error: 'server_error', detail: String(e.message) });
  }
});

// Status ändern
router.patch('/:id', requireAuth, requireRole('hr','admin'), async (req, res) => {
  try {
    const { status, location, startsAt, endsAt } = req.body || {};
    const m = await Meeting.findById(req.params.id);
    if (!m) return res.status(404).json({ error: 'not_found' });
    if (status) m.status = status;
    if (location !== undefined) m.location = location;
    if (startsAt) m.startsAt = new Date(startsAt);
    if (endsAt)   m.endsAt   = new Date(endsAt);
    await m.save();
    return res.json({ ok: true, id: String(m._id), status: m.status });
  } catch (e) {
    console.error('[meetings.patch] error', e.message);
    return res.status(500).json({ error: 'server_error', detail: String(e.message) });
  }
});

export default router;
