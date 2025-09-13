import { Router } from 'express';
import Job from '../models/Job.js';

const router = Router();

// GET /api/public/jobs
router.get('/jobs', async (_req, res) => {
  const jobs = await Job.find().sort({ createdAt: -1 });
  res.json(
    jobs.map(j => ({
      id: j._id,
      title: j.title,
      description: j.description
    }))
  );
});

export default router;
