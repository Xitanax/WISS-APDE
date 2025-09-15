import express from 'express';
import { ObjectId } from 'mongodb';
import { requireAuth, requireRole } from '../../lib/auth.js';

const router = express.Router();

// Get database connection
function getDb() {
  // Database will be available as global 'db' from server.js
  return global.db || db;
}

// Helper to get user by email
async function getUserByEmail(email) {
  const db = getDb();
  return db.collection('users').findOne({ email });
}

// HR creates meeting proposal with multiple time slots
router.post('/', requireAuth, requireRole('hr', 'admin'), async (req, res) => {
  try {
    const { jobId, applicantEmail, timeSlots, mode, location } = req.body || {};
    
    if (!jobId || !applicantEmail || !timeSlots || timeSlots.length === 0) {
      return res.status(400).json({ error: 'jobId, applicantEmail, and timeSlots required' });
    }

    const db = getDb();
    
    const job = await db.collection('jobs').findOne({ _id: new ObjectId(jobId) });
    if (!job) return res.status(404).json({ error: 'job_not_found' });

    const applicant = await db.collection('users').findOne({ email: applicantEmail });
    if (!applicant) return res.status(404).json({ error: 'applicant_not_found' });

    // Check if applicant status is "in_review"
    const application = await db.collection('applications').findOne({ 
      job: new ObjectId(jobId), 
      applicant: applicant._id,
      status: 'in_review' 
    });
    if (!application) {
      return res.status(400).json({ error: 'applicant_must_be_in_review_status' });
    }

    const hr = await getUserByEmail(req.user.email);

    // Cancel any existing meetings for this job/applicant
    await db.collection('meetings').updateMany(
      { job: new ObjectId(jobId), applicant: applicant._id },
      { $set: { status: 'cancelled' } }
    );

    const meetingData = {
      job: job._id,
      applicant: applicant._id,
      hr: hr._id,
      timeSlots: timeSlots.map(slot => ({
        _id: new ObjectId(),
        startsAt: new Date(slot.startsAt),
        endsAt: new Date(slot.endsAt),
        selected: false
      })),
      mode: mode || 'online',
      location: location || '',
      status: 'proposed',
      createdBy: 'hr',
      lastActionBy: 'hr',
      createdAt: new Date()
    };

    const result = await db.collection('meetings').insertOne(meetingData);

    return res.json({ 
      ok: true, 
      id: result.insertedId.toString(), 
      status: meetingData.status,
      timeSlots: meetingData.timeSlots.length 
    });
  } catch (e) {
    console.error('[meetings.create] error', e.message);
    return res.status(500).json({ error: 'server_error', detail: String(e.message) });
  }
});

// Applicant selects a time slot
router.post('/:id/select-slot', requireAuth, requireRole('applicant'), async (req, res) => {
  try {
    const { slotId } = req.body || {};
    if (!slotId) return res.status(400).json({ error: 'slotId_required' });

    const db = getDb();
    const meeting = await db.collection('meetings').findOne({ _id: new ObjectId(req.params.id) });
    if (!meeting) return res.status(404).json({ error: 'not_found' });

    const me = await getUserByEmail(req.user.email);
    if (meeting.applicant.toString() !== me._id.toString()) {
      return res.status(403).json({ error: 'forbidden' });
    }

    if (meeting.status !== 'proposed' && meeting.status !== 'rescheduled') {
      return res.status(400).json({ error: 'invalid_status_for_selection' });
    }

    const selectedSlot = meeting.timeSlots.find(slot => slot._id.toString() === slotId);
    if (!selectedSlot) return res.status(404).json({ error: 'slot_not_found' });

    // Update meeting with selected slot
    await db.collection('meetings').updateOne(
      { _id: new ObjectId(req.params.id) },
      { 
        $set: { 
          'timeSlots.$[].selected': false,
          finalStartsAt: selectedSlot.startsAt,
          finalEndsAt: selectedSlot.endsAt,
          status: 'confirmed',
          lastActionBy: 'applicant'
        }
      }
    );

    // Set selected slot to true
    await db.collection('meetings').updateOne(
      { _id: new ObjectId(req.params.id), 'timeSlots._id': new ObjectId(slotId) },
      { $set: { 'timeSlots.$.selected': true } }
    );

    return res.json({ ok: true, status: 'confirmed' });
  } catch (e) {
    console.error('[meetings.select-slot] error', e.message);
    return res.status(500).json({ error: 'server_error', detail: String(e.message) });
  }
});

// Request reschedule (Applicant or HR)
router.post('/:id/request-reschedule', requireAuth, async (req, res) => {
  try {
    const { reason } = req.body || {};
    
    const db = getDb();
    const meeting = await db.collection('meetings').findOne({ _id: new ObjectId(req.params.id) });
    if (!meeting) return res.status(404).json({ error: 'not_found' });

    const me = await getUserByEmail(req.user.email);
    const isApplicant = meeting.applicant.toString() === me._id.toString();
    const isHR = ['hr', 'admin'].includes(req.user.role) && 
                 meeting.hr.toString() === me._id.toString();

    if (!isApplicant && !isHR) {
      return res.status(403).json({ error: 'forbidden' });
    }

    if (meeting.status !== 'confirmed') {
      return res.status(400).json({ error: 'can_only_reschedule_confirmed_meetings' });
    }

    await db.collection('meetings').updateOne(
      { _id: new ObjectId(req.params.id) },
      { 
        $set: { 
          status: 'reschedule_requested',
          rescheduleReason: reason || '',
          lastActionBy: isApplicant ? 'applicant' : 'hr'
        }
      }
    );

    return res.json({ ok: true, status: 'reschedule_requested' });
  } catch (e) {
    console.error('[meetings.reschedule] error', e.message);
    return res.status(500).json({ error: 'server_error', detail: String(e.message) });
  }
});

// HR responds to reschedule with new time slots
router.post('/:id/reschedule-response', requireAuth, requireRole('hr', 'admin'), async (req, res) => {
  try {
    const { timeSlots } = req.body || {};
    
    if (!timeSlots || timeSlots.length === 0) {
      return res.status(400).json({ error: 'timeSlots_required' });
    }

    const db = getDb();
    const meeting = await db.collection('meetings').findOne({ _id: new ObjectId(req.params.id) });
    if (!meeting) return res.status(404).json({ error: 'not_found' });

    if (meeting.status !== 'reschedule_requested') {
      return res.status(400).json({ error: 'invalid_status_for_reschedule_response' });
    }

    await db.collection('meetings').updateOne(
      { _id: new ObjectId(req.params.id) },
      { 
        $set: { 
          timeSlots: timeSlots.map(slot => ({
            _id: new ObjectId(),
            startsAt: new Date(slot.startsAt),
            endsAt: new Date(slot.endsAt),
            selected: false
          })),
          status: 'rescheduled',
          lastActionBy: 'hr'
        },
        $unset: {
          finalStartsAt: 1,
          finalEndsAt: 1
        }
      }
    );

    return res.json({ ok: true, status: 'rescheduled' });
  } catch (e) {
    console.error('[meetings.reschedule-response] error', e.message);
    return res.status(500).json({ error: 'server_error', detail: String(e.message) });
  }
});

// Get meetings for current user
router.get('/me', requireAuth, async (req, res) => {
  try {
    const me = await getUserByEmail(req.user.email);
    if (!me) return res.status(401).json({ error: 'invalid_token' });

    const db = getDb();
    const query = (req.user.role === 'applicant') ? 
      { applicant: me._id } : 
      { hr: me._id };
    
    const meetings = await db.collection('meetings').aggregate([
      { $match: query },
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

    return res.json(meetings.map(m => ({
      id: m._id.toString(),
      status: m.status,
      timeSlots: m.timeSlots,
      finalStartsAt: m.finalStartsAt,
      finalEndsAt: m.finalEndsAt,
      mode: m.mode,
      location: m.location,
      lastActionBy: m.lastActionBy,
      rescheduleReason: m.rescheduleReason,
      job: { id: m.job._id.toString(), title: m.job.title },
      applicant: req.user.role !== 'applicant' ? { 
        email: m.applicant.email, 
        name: m.applicant.name 
      } : undefined
    })));
  } catch (e) {
    console.error('[meetings.me] error', e.message);
    return res.status(500).json({ error: 'server_error', detail: String(e.message) });
  }
});

// HR gets meetings for a job
router.get('/', requireAuth, requireRole('hr', 'admin'), async (req, res) => {
  try {
    const { jobId } = req.query;
    if (!jobId) return res.status(400).json({ error: 'jobId_required' });

    const db = getDb();
    const meetings = await db.collection('meetings').aggregate([
      { $match: { job: new ObjectId(jobId) } },
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

    return res.json(meetings.map(m => ({
      id: m._id.toString(),
      status: m.status,
      timeSlots: m.timeSlots,
      finalStartsAt: m.finalStartsAt,
      finalEndsAt: m.finalEndsAt,
      mode: m.mode,
      location: m.location,
      lastActionBy: m.lastActionBy,
      rescheduleReason: m.rescheduleReason,
      applicant: { email: m.applicant.email, name: m.applicant.name }
    })));
  } catch (e) {
    console.error('[meetings.list] error', e.message);
    return res.status(500).json({ error: 'server_error', detail: String(e.message) });
  }
});

export default router;
