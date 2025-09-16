import { Router } from 'express';
import Job from '../models/Job.js';

const router = Router();

// GET /api/public/jobs
router.get('/jobs', async (_req, res) => {
  const jobs = await Job.find({ open: true }).sort({ createdAt: -1 });
  res.json(
    jobs.map(j => ({
      id: j._id,
      title: j.title,
      shortDescription: j.shortDescription || j.description || '',
      description: j.description || '',
      createdAt: j.createdAt,
      linkedinPostId: j.linkedinPostId || null
    }))
  );
});

router.get('/jobs/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).lean();
    if (!job || job.open === false) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      id: job._id,
      title: job.title,
      shortDescription: job.shortDescription || job.description || '',
      description: job.description || '',
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      open: job.open !== false,
      linkedinPostId: job.linkedinPostId || null
    });
  } catch (error) {
    res.status(400).json({ error: 'Invalid job id' });
  }
});

export default router;
