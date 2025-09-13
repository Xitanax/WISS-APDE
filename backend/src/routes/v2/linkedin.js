// src/routes/v2/linkedin.js
import express from 'express';
import mongoose from 'mongoose';
import { publishJob, unpublishJob, importApplicant } from '../../utils/linkedinClient.js';
import { requireAuth, requireRole } from '../../lib/auth.js';

const router = express.Router();

function getModelOrFail(name) {
  const m = mongoose.models[name];
  if (!m) throw new Error(`model_not_registered:${name}`);
  return m;
}

// Job zu LinkedIn "veröffentlichen" (Dummy)
router.post('/publish/:jobId', requireAuth, requireRole('admin', 'hr'), async (req, res) => {
  try {
    const Job = getModelOrFail('Job');
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'job_not_found' });

    const { postId, url } = await publishJob(job);
    // Falls dein Job-Schema kein linkedinPostId hat, wird das Attribut einfach ignoriert (strict).
    job.linkedinPostId = postId;
    await job.save();

    return res.json({ ok: true, jobId: String(job._id), linkedinPostId: postId, url });
  } catch (e) {
    console.error('[linkedin.publish] error', e.message);
    return res.status(500).json({ error: 'server_error', detail: String(e.message) });
  }
});

// Veröffentlichung zurückziehen
router.delete('/publish/:jobId', requireAuth, requireRole('admin', 'hr'), async (req, res) => {
  try {
    const Job = getModelOrFail('Job');
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'job_not_found' });

    await unpublishJob(job);
    job.linkedinPostId = undefined;
    await job.save();
    return res.json({ ok: true });
  } catch (e) {
    console.error('[linkedin.unpublish] error', e.message);
    return res.status(500).json({ error: 'server_error', detail: String(e.message) });
  }
});

// Bewerber aus LinkedIn importieren (Dummy)
router.post('/import-applicant', requireAuth, requireRole('admin', 'hr'), async (req, res) => {
  try {
    const { profileUrl, email, name, birthdate, address } = req.body || {};
    if (!profileUrl || !email) return res.status(400).json({ error: 'profileUrl_and_email_required' });

    const User = getModelOrFail('User');
    const imported = await importApplicant({ profileUrl, email, name });

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        role: 'applicant',
        passwordHash: '',
        birthdate: birthdate ? new Date(birthdate) : undefined,
        address: address || undefined,
      });
    }
    return res.json({ ok: true, imported, user: { id: String(user._id), email: user.email, role: user.role } });
  } catch (e) {
    console.error('[linkedin.import] error', e.message);
    return res.status(500).json({ error: 'server_error', detail: String(e.message) });
  }
});

export default router;
