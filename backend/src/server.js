import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { MongoClient, ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { mountApiDocs } from "./apiDocs.js";
import meetingsRouter from "./routes/v2/meetings.js";
import applicationsRouter from "./routes/v2/applications.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/chocadies";
const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

let db;

// Middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(morgan("combined"));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// File upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files allowed'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Auth middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }
  
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// Connect to MongoDB
async function connectDB() {
  try {
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    db = client.db();
    global.db = db;
    console.log('Connected to MongoDB');
    
    // Create indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('agencies').createIndex({ apiKey: 1 }, { unique: true });
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.send('ok');
});

// Authentication routes
app.post('/api/auth/bootstrap-admin', async (req, res) => {
  try {
    const secret = req.header('x-bootstrap-secret');
    if (!secret || secret !== process.env.BOOTSTRAP_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const email = process.env.ADMIN_EMAIL || 'admin@chocadies.ch';
    const password = process.env.ADMIN_PASSWORD || 'secret123';

    let existing = await db.collection('users').findOne({ email });
    if (existing) {
      return res.status(200).json({
        ok: true,
        user: { id: existing._id, email: existing.email, role: existing.role }
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.collection('users').insertOne({ 
      email, 
      passwordHash, 
      role: 'admin',
      createdAt: new Date()
    });
    
    return res.status(201).json({
      ok: true,
      user: { id: result.insertedId, email, role: 'admin' }
    });
  } catch (err) {
    console.error('[bootstrap-admin] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
        id: user._id.toString(),
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ token });
  } catch (err) {
    console.error('[login] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(req.user.id) },
      { projection: { passwordHash: 0 } }
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      birthdate: user.birthdate,
      address: user.address
    });
  } catch (err) {
    console.error('[me] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Public routes
app.post('/api/public/register', async (req, res) => {
  try {
    const { email, password, name, birthdate, address } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const existing = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.collection('users').insertOne({
      email: email.toLowerCase(),
      passwordHash,
      role: 'applicant',
      name: name || '',
      birthdate: birthdate ? new Date(birthdate) : null,
      address: address || '',
      createdAt: new Date()
    });

    res.status(201).json({ ok: true, id: result.insertedId });
  } catch (err) {
    console.error('[register] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.get('/api/public/jobs', async (req, res) => {
  try {
    const jobs = await db.collection('jobs').find({ open: true }).sort({ createdAt: -1 }).toArray();
    res.json(jobs.map(job => ({
      id: job._id.toString(),
      title: job.title,
      description: job.description,
      createdAt: job.createdAt,
      linkedinPostId: job.linkedinPostId
    })));
  } catch (err) {
    console.error('[public-jobs] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// New enhanced routes
app.use("/api/v2/meetings", meetingsRouter);
app.use("/api/v2", applicationsRouter);

// Jobs management (HR/Admin)
app.get('/api/v2/jobs', requireAuth, requireRole('admin', 'hr'), async (req, res) => {
  try {
    const jobs = await db.collection('jobs').find({}).sort({ createdAt: -1 }).toArray();
    res.json(jobs.map(job => ({
      id: job._id.toString(),
      title: job.title,
      description: job.description,
      open: job.open !== false,
      createdAt: job.createdAt,
      linkedinPostId: job.linkedinPostId
    })));
  } catch (err) {
    console.error('[jobs] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/api/v2/jobs', requireAuth, requireRole('admin', 'hr'), async (req, res) => {
  try {
    const { title, description = '', open = true } = req.body || {};
    if (!title) {
      return res.status(400).json({ error: 'Title required' });
    }

    const result = await db.collection('jobs').insertOne({
      title,
      description,
      open,
      createdAt: new Date()
    });

    res.status(201).json({
      id: result.insertedId.toString(),
      title,
      description,
      open
    });
  } catch (err) {
    console.error('[create-job] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.patch('/api/v2/jobs/:id', requireAuth, requireRole('admin', 'hr'), async (req, res) => {
  try {
    const { title, description, open } = req.body || {};
    const updateFields = {};
    
    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (open !== undefined) updateFields.open = open;

    const result = await db.collection('jobs').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      id: result.value._id.toString(),
      title: result.value.title,
      description: result.value.description,
      open: result.value.open
    });
  } catch (err) {
    console.error('[update-job] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.delete('/api/v2/jobs/:id', requireAuth, requireRole('admin', 'hr'), async (req, res) => {
  try {
    const result = await db.collection('jobs').deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[delete-job] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// CV Management
app.post('/api/v2/cv', requireAuth, requireRole('applicant'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await db.collection('cvs').insertOne({
      applicant: new ObjectId(req.user.id),
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      uploadedAt: new Date()
    });

    res.status(201).json({
      id: result.insertedId.toString(),
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (err) {
    console.error('[upload-cv] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.get('/api/v2/cv/me', requireAuth, requireRole('applicant'), async (req, res) => {
  try {
    const cvs = await db.collection('cvs').find({ 
      applicant: new ObjectId(req.user.id) 
    }).sort({ uploadedAt: -1 }).toArray();

    res.json(cvs.map(cv => ({
      id: cv._id.toString(),
      originalName: cv.originalName,
      size: cv.size,
      uploadedAt: cv.uploadedAt
    })));
  } catch (err) {
    console.error('[my-cvs] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.get('/api/v2/cv/:id/download', requireAuth, async (req, res) => {
  try {
    const cv = await db.collection('cvs').findOne({ _id: new ObjectId(req.params.id) });
    if (!cv) {
      return res.status(404).json({ error: 'CV not found' });
    }

    // Check access rights
    if (req.user.role === 'applicant' && cv.applicant.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.download(cv.path, cv.originalName);
  } catch (err) {
    console.error('[download-cv] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.delete('/api/v2/cv/:id', requireAuth, requireRole('applicant'), async (req, res) => {
  try {
    const result = await db.collection('cvs').deleteOne({
      _id: new ObjectId(req.params.id),
      applicant: new ObjectId(req.user.id)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'CV not found' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[delete-cv] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// User Management (Admin)
app.get('/api/v2/admin/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const users = await db.collection('users').find(
      {},
      { projection: { passwordHash: 0 } }
    ).sort({ createdAt: -1 }).toArray();

    res.json(users.map(user => ({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      createdAt: user.createdAt
    })));
  } catch (err) {
    console.error('[admin-users] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/api/v2/admin/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { email, password = 'secret123', role = 'applicant' } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const existing = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.collection('users').insertOne({
      email: email.toLowerCase(),
      passwordHash,
      role,
      createdAt: new Date()
    });

    res.status(201).json({
      id: result.insertedId.toString(),
      email: email.toLowerCase(),
      role
    });
  } catch (err) {
    console.error('[create-user] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.patch('/api/v2/admin/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { email, password, role } = req.body || {};
    const updateFields = {};
    
    if (email) updateFields.email = email.toLowerCase();
    if (password) updateFields.passwordHash = await bcrypt.hash(password, 10);
    if (role) updateFields.role = role;

    const result = await db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: result.value._id.toString(),
      email: result.value.email,
      role: result.value.role
    });
  } catch (err) {
    console.error('[update-user] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.delete('/api/v2/admin/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[delete-user] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Profile management (Applicant)
app.get('/api/applicant/profile', requireAuth, requireRole('applicant'), async (req, res) => {
  try {
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(req.user.id) },
      { projection: { passwordHash: 0 } }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user._id.toString(),
      email: user.email,
      name: user.name || '',
      birthdate: user.birthdate,
      address: user.address || '',
      deleteAt: user.deleteAt
    });
  } catch (err) {
    console.error('[profile] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.put('/api/applicant/profile', requireAuth, requireRole('applicant'), async (req, res) => {
  try {
    const { name, birthdate, address } = req.body || {};
    const updateFields = {};
    
    if (name !== undefined) updateFields.name = name;
    if (birthdate !== undefined) updateFields.birthdate = birthdate ? new Date(birthdate) : null;
    if (address !== undefined) updateFields.address = address;

    const result = await db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(req.user.id) },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[update-profile] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/api/applicant/delete-request', requireAuth, requireRole('applicant'), async (req, res) => {
  try {
    const deleteAt = new Date();
    deleteAt.setDate(deleteAt.getDate() + 30); // 30 days from now

    await db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(req.user.id) },
      { $set: { deleteAt } }
    );

    res.json({ ok: true, deleteAt });
  } catch (err) {
    console.error('[delete-request] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.delete('/api/applicant/delete-request', requireAuth, requireRole('applicant'), async (req, res) => {
  try {
    await db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(req.user.id) },
      { $unset: { deleteAt: 1 } }
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[cancel-delete-request] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Agency Management (Partner API)
app.get('/api/v2/agencies', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const agencies = await db.collection('agencies').find({}).sort({ createdAt: -1 }).toArray();
    res.json(agencies.map(agency => ({
      id: agency._id.toString(),
      name: agency.name,
      apiKey: agency.apiKey,
      active: agency.active,
      permissions: agency.permissions,
      createdAt: agency.createdAt
    })));
  } catch (err) {
    console.error('[agencies] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/api/v2/agencies', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { name, permissions = ['jobs:read', 'applications:read'] } = req.body || {};
    if (!name) {
      return res.status(400).json({ error: 'Name required' });
    }

    const apiKey = 'api_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    const result = await db.collection('agencies').insertOne({
      name,
      apiKey,
      permissions,
      active: true,
      createdAt: new Date()
    });

    res.status(201).json({
      id: result.insertedId.toString(),
      apiKey
    });
  } catch (err) {
    console.error('[create-agency] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.patch('/api/v2/agencies/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { active, permissions, name } = req.body || {};
    const updateFields = {};
    
    if (typeof active === 'boolean') updateFields.active = active;
    if (Array.isArray(permissions)) updateFields.permissions = permissions;
    if (name) updateFields.name = name;

    const result = await db.collection('agencies').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({ error: 'Agency not found' });
    }

    res.json({
      id: result.value._id.toString(),
      active: result.value.active,
      permissions: result.value.permissions
    });
  } catch (err) {
    console.error('[update-agency] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/api/v2/agencies/:id/rotate-key', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const apiKey = 'api_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    const result = await db.collection('agencies').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: { apiKey } },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({ error: 'Agency not found' });
    }

    res.json({ apiKey });
  } catch (err) {
    console.error('[rotate-key] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.delete('/api/v2/agencies/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await db.collection('agencies').deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Agency not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[delete-agency] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// LinkedIn Integration (Dummy)
app.post('/api/v2/linkedin/publish/:jobId', requireAuth, requireRole('admin', 'hr'), async (req, res) => {
  try {
    const job = await db.collection('jobs').findOne({ _id: new ObjectId(req.params.jobId) });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const postId = 'li_' + req.params.jobId.slice(-6);
    const url = `https://www.linkedin.com/feed/update/${postId}`;
    
    // Update job with LinkedIn post ID
    await db.collection('jobs').findOneAndUpdate(
      { _id: new ObjectId(req.params.jobId) },
      { $set: { linkedinPostId: postId } }
    );
    
    // Log the LinkedIn publish action
    console.log(`[LinkedIn] Job "${job.title}" published to LinkedIn with post ID: ${postId}`);
    console.log(`[LinkedIn] URL: ${url}`);
    console.log(`[LinkedIn] Timestamp: ${new Date().toISOString()}`);

    res.json({ 
      ok: true, 
      jobId: req.params.jobId, 
      linkedinPostId: postId, 
      url 
    });
  } catch (err) {
    console.error('[linkedin-publish] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.delete('/api/v2/linkedin/publish/:jobId', requireAuth, requireRole('admin', 'hr'), async (req, res) => {
  try {
    const job = await db.collection('jobs').findOne({ _id: new ObjectId(req.params.jobId) });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Remove LinkedIn post ID
    await db.collection('jobs').findOneAndUpdate(
      { _id: new ObjectId(req.params.jobId) },
      { $unset: { linkedinPostId: 1 } }
    );
    
    // Log the LinkedIn unpublish action
    console.log(`[LinkedIn] Job "${job.title}" unpublished from LinkedIn`);
    console.log(`[LinkedIn] Timestamp: ${new Date().toISOString()}`);

    res.json({ ok: true });
  } catch (err) {
    console.error('[linkedin-unpublish] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Partner API (External access)
async function agencyKeyAuth(req, res, next) {
  try {
    const key = req.headers['x-api-key'];
    if (!key) {
      return res.status(401).json({ error: 'Missing API key' });
    }

    const agency = await db.collection('agencies').findOne({ apiKey: key, active: true });
    if (!agency) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    req.agency = {
      id: agency._id.toString(),
      name: agency.name,
      permissions: agency.permissions
    };
    next();
  } catch (err) {
    console.error('[agency-auth] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.agency?.permissions?.includes(permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

app.get('/api/agency/jobs', agencyKeyAuth, requirePermission('jobs:read'), async (req, res) => {
  try {
    const jobs = await db.collection('jobs').find({ open: true }).sort({ createdAt: -1 }).toArray();
    res.json(jobs.map(job => ({
      id: job._id.toString(),
      title: job.title,
      description: job.description,
      linkedinPostId: job.linkedinPostId || null
    })));
  } catch (err) {
    console.error('[agency-jobs] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.get('/api/agency/applications', agencyKeyAuth, requirePermission('applications:read'), async (req, res) => {
  try {
    const { jobId } = req.query;
    const matchStage = jobId ? { job: new ObjectId(jobId) } : {};

    const applications = await db.collection('applications').aggregate([
      { $match: matchStage },
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

    res.json(applications.map(app => ({
      id: app._id.toString(),
      status: app.status,
      job: {
        id: app.job._id.toString(),
        title: app.job.title
      },
      applicant: {
        email: app.applicant.email
      },
      createdAt: app.createdAt
    })));
  } catch (err) {
    console.error('[agency-applications] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Mount API documentation
mountApiDocs(app);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🍫 Chocadies server running on port ${PORT}`);
    console.log(`📚 API documentation: http://localhost:${PORT}/api/docs`);
  });
});
