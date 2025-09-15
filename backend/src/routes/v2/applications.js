import express from 'express';
import { ObjectId } from 'mongodb';
import { requireAuth, requireRole } from '../../lib/auth.js';

const router = express.Router();

// Get database connection
function getDb() {
  return global.db || db;
}

// APPLICANT: Submit application
router.post('/applications', requireAuth, requireRole('applicant'), async (req, res) => {
  const { jobId, note = '' } = req.body || {};
  if (!jobId) return res.status(400).json({ error: 'jobId required' });
  try {
    const db = getDb();
    const found = await db.collection('applications').findOne({ 
      job: new ObjectId(jobId), 
      applicant: new ObjectId(req.user.id) 
    });
    if (found) return res.status(409).json({ error: 'already_applied' });
    
    const created = await db.collection('applications').insertOne({ 
      job: new ObjectId(jobId), 
      applicant: new ObjectId(req.user.id),
      status: 'submitted',
      applicantNote: note,
      createdAt: new Date()
    });
    res.status(201).json({ id: created.insertedId.toString(), status: 'submitted' });
  } catch (e) { 
    console.error(e); 
    res.status(500).json({ error: 'server error' }); 
  }
});

// APPLICANT: Get my applications
router.get('/applications/me', requireAuth, requireRole('applicant'), async (req, res) => {
  try {
    const db = getDb();
    const list = await db.collection('applications').aggregate([
      { $match: { applicant: new ObjectId(req.user.id) } },
      {
        $lookup: {
          from: 'jobs',
          localField: 'job',
          foreignField: '_id',
          as: 'job'
        }
      },
      { $unwind: '$job' },
      { $sort: { createdAt: -1 } }
    ]).toArray();
    
    res.json(list.map(app => ({
      id: app._id.toString(),
      status: app.status,
      applicantNote: app.applicantNote,
      createdAt: app.createdAt,
      job: {
        id: app.job._id.toString(),
        title: app.job.title
      }
    })));
  } catch (e) { 
    console.error(e); 
    res.status(500).json({ error: 'server error' }); 
  }
});

// APPLICANT: Withdraw application
router.patch('/applications/:id/withdraw', requireAuth, requireRole('applicant'), async (req, res) => {
  try {
    const db = getDb();
    
    const application = await db.collection('applications').findOne({
      _id: new ObjectId(req.params.id),
      applicant: new ObjectId(req.user.id),
      status: { $in: ['submitted', 'in_review'] }
    });
    
    if (!application) {
      return res.status(404).json({ error: 'application_not_found_or_cannot_withdraw' });
    }

    // Update application status
    await db.collection('applications').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: 'withdrawn' } }
    );

    // Cancel any associated meetings
    await db.collection('meetings').updateMany(
      { job: application.job, applicant: new ObjectId(req.user.id) },
      { $set: { status: 'cancelled' } }
    );

    res.json({ ok: true });
  } catch (e) { 
    console.error(e); 
    res.status(500).json({ error: 'server error' }); 
  }
});

// ADMIN/HR: Get applications with filtering
router.get('/applications', requireAuth, requireRole('admin', 'hr'), async (req, res) => {
  const { jobId, status } = req.query;
  const filter = {};
  if (jobId) filter.job = new ObjectId(jobId);
  if (status) {
    if (status === 'active') {
      filter.status = { $in: ['submitted', 'in_review'] };
    } else if (status === 'archived') {
      filter.status = { $in: ['accepted', 'rejected'] };
    } else if (status === 'unprocessed') {
      filter.status = 'submitted';
    } else {
      filter.status = status;
    }
  }
  
  try {
    const db = getDb();
    const list = await db.collection('applications').aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'jobs',
          localField: 'job',
          foreignField: '_id',
          as: 'job'
        }
      },
      { $unwind: '$job' },
      {
        $lookup: {
          from: 'users',
          localField: 'applicant',
          foreignField: '_id',
          as: 'applicant'
        }
      },
      { $unwind: '$applicant' },
      { $sort: { createdAt: -1 } }
    ]).toArray();
    
    res.json(list.map(app => ({
      id: app._id.toString(),
      status: app.status,
      applicantNote: app.applicantNote,
      createdAt: app.createdAt,
      job: {
        id: app.job._id.toString(),
        title: app.job.title
      },
      applicant: {
        id: app.applicant._id.toString(),
        email: app.applicant.email,
        name: app.applicant.name
      }
    })));
  } catch (e) { 
    console.error(e); 
    res.status(500).json({ error: 'server error' }); 
  }
});

// ADMIN/HR: Update application status
router.patch('/applications/:id', requireAuth, requireRole('admin', 'hr'), async (req, res) => {
  const { status } = req.body || {};
  const allowed = ['submitted', 'in_review', 'rejected', 'accepted'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'invalid status' });
  
  try {
    const db = getDb();
    
    const application = await db.collection('applications').findOne({ _id: new ObjectId(req.params.id) });
    if (!application) return res.status(404).json({ error: 'not found' });

    await db.collection('applications').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status } }
    );

    // Handle meeting cancellation when rejected
    if (status === 'rejected') {
      await db.collection('meetings').updateMany(
        { job: application.job, applicant: application.applicant },
        { $set: { status: 'cancelled' } }
      );
    }

    const updated = await db.collection('applications').findOne({ _id: new ObjectId(req.params.id) });
    res.json({
      id: updated._id.toString(),
      status: updated.status
    });
  } catch (e) { 
    console.error(e); 
    res.status(500).json({ error: 'server error' }); 
  }
});

export default router;
