// backend/src/server.js
// Rollen:
// - admin: User-Management + Agencies (externe Partner, API-Key)
// - hr:    Jobs, Applications, Meetings, LinkedIn-Dummy
// - applicant: Bewerben, eigene Bewerbungen/Meetings
import express from "express";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { MongoClient, ObjectId } from "mongodb";
import { randomBytes } from "node:crypto";
import { mountApiDocs } from "./apiDocs.js";

const PORT = Number(process.env.PORT || 3000);
const MONGO_URL = process.env.MONGO_URL || "mongodb://mongo:27017/chocadies";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "1d";
const BOOTSTRAP_SECRET = process.env.BOOTSTRAP_SECRET || "my-super-secret";

const app = express();
app.set("x-powered-by", false);
app.use(express.json());
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        "default-src": ["'self'"],
        "base-uri": ["'self'"],
        "font-src": ["'self'", "https:", "data:"],
        "form-action": ["'self'"],
        "frame-ancestors": ["'self'"],
        "img-src": ["'self'", "data:"],
        "object-src": ["'none'"],
        "script-src": ["'self'"],
        "script-src-attr": ["'none'"],
        "style-src": ["'self'", "https:", "'unsafe-inline'"],
        "upgrade-insecure-requests": [],
      },
    },
    referrerPolicy: { policy: "no-referrer" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: "sameorigin" },
    xssFilter: false,
    hsts: { maxAge: 15552000, includeSubDomains: true },
  })
);
app.use((_req, res, next) => { res.setHeader("Vary", "Origin"); res.setHeader("Access-Control-Allow-Credentials", "true"); next(); });

const client = new MongoClient(MONGO_URL);
let db, Users, Jobs, Applications, Meetings, Agencies;

async function initDb() {
  await client.connect();
  db = client.db();
  Users = db.collection("users");
  Jobs = db.collection("jobs");
  Applications = db.collection("applications");
  Meetings = db.collection("meetings");
  Agencies = db.collection("agencies");

  await Users.createIndex({ email: 1 }, { unique: true, background: true });
  await Users.createIndex({ role: 1 }, { background: true });

  await Jobs.createIndex({ open: 1 }, { background: true });

  await Applications.createIndex({ job: 1 }, { background: true });
  await Applications.createIndex({ user: 1 }, { background: true });
  await Applications.createIndex({ status: 1 }, { background: true });
  await Applications.createIndex({ deleteAt: 1 }, { background: true, partialFilterExpression: { deleteAt: { $exists: true } }, expireAfterSeconds: 0 });
  await Applications.createIndex({ job: 1, user: 1 }, { unique: true });
  await Applications.createIndex({ note: "text" }, { background: true });

  await Meetings.createIndex({ job: 1 }, { background: true });
  await Meetings.createIndex({ user: 1 }, { background: true });
  await Meetings.createIndex({ status: 1 }, { background: true });

  await Agencies.createIndex({ apiKey: 1 }, { unique: true, background: true });

  console.log("[mongo] connected");
}

function signToken(payload) { return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES }); }
function authRequired(req, res, next) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ error: "Missing token" });
  try { req.user = jwt.verify(m[1], JWT_SECRET); next(); } catch { return res.status(401).json({ error: "Invalid token" }); }
}
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Missing token" });
    if (req.user.role !== role) return res.status(403).json({ error: "forbidden" });
    next();
  };
}
async function findUserByEmail(email) { if (!email) return null; return await Users.findOne({ email: String(email).toLowerCase() }); }
async function ensureApplicant(email, { name, birthdate, address } = {}) {
  const norm = String(email).toLowerCase();
  let user = await Users.findOne({ email: norm });
  if (!user) {
    const passwordHash = await bcrypt.hash("imported", 10);
    const doc = { email: norm, role: "applicant", passwordHash, name: name || null, birthdate: birthdate ? new Date(birthdate) : null, address: address || null, createdAt: new Date(), updatedAt: new Date() };
    const r = await Users.insertOne(doc); user = { ...doc, _id: r.insertedId };
  }
  return user;
}
function randKey(bytes = 24) { return randomBytes(bytes).toString("hex"); }

app.get("/", (_req, res) => res.redirect(302, "/api/docs"));
app.get("/api/health", (_req, res) => res.json("ok"));

// Auth & Register
app.post("/api/public/register", async (req, res) => {
  try {
    const { email, password, birthdate, address } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "missing_fields" });
    const existing = await findUserByEmail(email);
    if (existing) return res.status(400).json({ error: "email already registered" });
    const passwordHash = await bcrypt.hash(password, 10);
    const doc = { email: String(email).toLowerCase(), role: "applicant", passwordHash, birthdate: birthdate ? new Date(birthdate) : null, address: address || null, createdAt: new Date(), updatedAt: new Date() };
    const r = await Users.insertOne(doc);
    return res.json({ ok: true, id: r.insertedId.toString() });
  } catch (e) { console.error("register", e); return res.status(500).json({ error: "server_error" }); }
});
app.post("/api/auth/bootstrap-admin", async (req, res) => {
  try {
    const secret = req.headers["x-bootstrap-secret"];
    if (secret !== BOOTSTRAP_SECRET) return res.status(403).json({ error: "forbidden" });
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "missing_fields" });
    let user = await findUserByEmail(email);
    if (!user) {
      const passwordHash = await bcrypt.hash(password, 10);
      const doc = { email: String(email).toLowerCase(), role: "admin", passwordHash, createdAt: new Date(), updatedAt: new Date() };
      const r = await Users.insertOne(doc); user = { ...doc, _id: r.insertedId };
    } else if (user.role !== "admin") {
      await Users.updateOne({ _id: user._id }, { $set: { role: "admin", updatedAt: new Date() } });
      user.role = "admin";
    }
    return res.json({ ok: true, user: { id: user._id.toString(), email: user.email, role: user.role } });
  } catch (e) { console.error("bootstrap-admin", e); return res.status(500).json({ error: "server_error" }); }
});
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "missing_fields" });
    const user = await findUserByEmail(email);
    if (!user || !user.passwordHash) return res.status(401).json({ error: "invalid_credentials" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "invalid_credentials" });
    const token = signToken({ email: user.email, role: user.role, uid: user._id.toString() });
    return res.json({ token, email: user.email, role: user.role });
  } catch (e) { console.error("login", e); return res.status(500).json({ error: "server_error" }); }
});
app.get("/api/auth/me", authRequired, (req, res) => res.json({ email: req.user.email, role: req.user.role }));

// Öffentliche Jobs
app.get("/api/public/jobs", async (_req, res) => {
  const docs = await Jobs.find({ open: { $ne: false } }).sort({ _id: -1 }).toArray();
  res.json(docs.map(j => ({ id: j._id.toString(), title: j.title, description: j.description })));
});

// Admin: Users
app.get("/api/v2/users", authRequired, requireRole("admin"), async (_req, res) => {
  const list = await Users.find({}, { projection: { passwordHash: 0 } }).sort({ _id: -1 }).toArray();
  res.json(list.map(u => ({ id: u._id.toString(), email: u.email, role: u.role, name: u.name ?? null, birthdate: u.birthdate ?? null, address: u.address ?? null, createdAt: u.createdAt, updatedAt: u.updatedAt })));
});
app.post("/api/v2/users", authRequired, requireRole("admin"), async (req, res) => {
  const { email, password, role, name, birthdate, address } = req.body || {};
  if (!email || !password || !role) return res.status(400).json({ error: "missing_fields" });
  if (!["admin","hr","applicant"].includes(role)) return res.status(400).json({ error: "invalid_role" });
  const existing = await findUserByEmail(email);
  if (existing) return res.status(400).json({ error: "email exists" });
  const passwordHash = await bcrypt.hash(password, 10);
  const doc = { email: String(email).toLowerCase(), role, passwordHash, name: name ?? null, birthdate: birthdate ? new Date(birthdate) : null, address: address ?? null, createdAt: new Date(), updatedAt: new Date() };
  const r = await Users.insertOne(doc);
  res.status(201).json({ ok: true, id: r.insertedId.toString() });
});
app.patch("/api/v2/users/:id", authRequired, requireRole("admin"), async (req, res) => {
  const { role, password, name, birthdate, address } = req.body || {};
  const patch = { updatedAt: new Date() };
  if (role) { if (!["admin","hr","applicant"].includes(role)) return res.status(400).json({ error: "invalid_role" }); patch.role = role; }
  if (password) patch.passwordHash = await bcrypt.hash(password, 10);
  if (name !== undefined) patch.name = name;
  if (birthdate !== undefined) patch.birthdate = birthdate ? new Date(birthdate) : null;
  if (address !== undefined) patch.address = address;
  const r = await Users.updateOne({ _id: new ObjectId(req.params.id) }, { $set: patch });
  if (!r.matchedCount) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
});
app.delete("/api/v2/users/:id", authRequired, requireRole("admin"), async (req, res) => {
  await Users.deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ ok: true });
});

// HR: Jobs
app.post("/api/v2/jobs", authRequired, requireRole("hr"), async (req, res) => {
  const { title, description, open } = req.body || {};
  if (!title) return res.status(400).json({ error: "missing_title" });
  const doc = { title, description: description || "", open: open !== false, linkedinPostId: null, createdAt: new Date(), updatedAt: new Date() };
  const r = await Jobs.insertOne(doc);
  res.json({ id: r.insertedId.toString(), title: doc.title, description: doc.description, open: doc.open });
});
app.get("/api/v2/jobs", authRequired, requireRole("hr"), async (_req, res) => {
  const docs = await Jobs.find({}).sort({ _id: -1 }).toArray();
  res.json(docs);
});
app.patch("/api/v2/jobs/:id", authRequired, requireRole("hr"), async (req, res) => {
  const patch = {};
  ["title","description","open"].forEach(k => { if (req.body?.[k] !== undefined) patch[k] = req.body[k]; });
  patch.updatedAt = new Date();
  await Jobs.updateOne({ _id: new ObjectId(req.params.id) }, { $set: patch });
  res.json({ ok: true });
});
app.delete("/api/v2/jobs/:id", authRequired, requireRole("hr"), async (req, res) => {
  await Jobs.deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ ok: true });
});

// Applications
app.post("/api/v2/applications", authRequired, async (req, res) => {
  try {
    if (req.user.role !== "applicant") return res.status(403).json({ error: "forbidden" });
    const { jobId, note } = req.body || {};
    if (!jobId) return res.status(400).json({ error: "missing_jobId" });
    const job = await Jobs.findOne({ _id: new ObjectId(jobId) });
    if (!job || job.open === false) return res.status(404).json({ error: "job_not_found" });
    const user = await findUserByEmail(req.user.email);
    if (!user) return res.status(401).json({ error: "Invalid token" });
    try {
      const doc = { job: job._id, user: user._id, status: "submitted", note: note ? String(note) : null, createdAt: new Date(), updatedAt: new Date() };
      const r = await Applications.insertOne(doc);
      return res.status(201).json({ ok: true, id: r.insertedId.toString(), status: doc.status });
    } catch (e) {
      if (e?.code === 11000) return res.status(400).json({ error: "already_applied" });
      throw e;
    }
  } catch (e) { console.error("applications:create", e); return res.status(500).json({ error: "server_error" }); }
});
app.get("/api/v2/applications/me", authRequired, async (req, res) => {
  if (req.user.role !== "applicant") return res.status(403).json({ error: "forbidden" });
  const me = await findUserByEmail(req.user.email);
  const docs = await Applications.find({ user: me._id }).sort({ _id: -1 }).toArray();
  const jobs = await Jobs.find({ _id: { $in: docs.map(a => a.job) } }).toArray();
  const jMap = new Map(jobs.map(j => [j._id.toString(), j]));
  const out = docs.map(a => ({
    id: a._id.toString(),
    status: a.status,
    note: a.note ?? null,
    job: (() => { const j = jMap.get(a.job.toString()); return j ? { id: j._id.toString(), title: j.title, description: j.description } : null; })(),
    createdAt: a.createdAt,
  }));
  res.json(out);
});
app.get("/api/v2/applications", authRequired, requireRole("hr"), async (req, res) => {
  const { jobId } = req.query;
  const q = jobId ? { job: new ObjectId(String(jobId)) } : {};
  const docs = await Applications.find(q).sort({ _id: -1 }).limit(200).toArray();
  const userIds = docs.map(a => a.user);
  const jobIds = docs.map(a => a.job);
  const [users, jobs] = await Promise.all([
    Users.find({ _id: { $in: userIds } }).toArray(),
    Jobs.find({ _id: { $in: jobIds } }).toArray(),
  ]);
  const uMap = new Map(users.map(u => [u._id.toString(), u]));
  const jMap = new Map(jobs.map(j => [j._id.toString(), j]));
  const out = docs.map(a => ({
    id: a._id.toString(),
    status: a.status,
    note: a.note ?? null,
    applicant: (() => { const u = uMap.get(a.user.toString()); return u ? { email: u.email, birthdate: u.birthdate || null, address: u.address || null } : null; })(),
    job: (() => { const j = jMap.get(a.job.toString()); return j ? { id: j._id.toString(), title: j.title } : null; })(),
    createdAt: a.createdAt,
  }));
  res.json(out);
});
app.patch("/api/v2/applications/:id", authRequired, requireRole("hr"), async (req, res) => {
  const { status, note } = req.body || {};
  if (!status && note === undefined) return res.status(400).json({ error: "missing_fields" });
  const patch = { updatedAt: new Date() };
  if (status) patch.status = status;
  if (note !== undefined) patch.note = note;
  const r = await Applications.updateOne({ _id: new ObjectId(req.params.id) }, { $set: patch });
  if (!r.matchedCount) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true, id: req.params.id, ...(patch.status ? { status: patch.status } : {}) });
});
app.delete("/api/v2/applications/:id", authRequired, requireRole("hr"), async (req, res) => {
  await Applications.deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ ok: true });
});

// Meetings
app.post("/api/v2/meetings", authRequired, async (req, res) => {
  try {
    const { jobId, startsAt, endsAt, mode, location, applicantEmail } = req.body || {};
    if (!jobId || !startsAt || !endsAt) return res.status(400).json({ error: "missing_fields" });
    const job = await Jobs.findOne({ _id: new ObjectId(jobId) });
    if (!job) return res.status(404).json({ error: "job_not_found" });

    let userDoc;
    if (req.user.role === "hr") {
      if (!applicantEmail) return res.status(400).json({ error: "missing_applicantEmail" });
      userDoc = await ensureApplicant(applicantEmail);
    } else if (req.user.role === "applicant") {
      userDoc = await findUserByEmail(req.user.email);
    } else return res.status(403).json({ error: "forbidden" });

    const doc = { job: job._id, user: userDoc._id, status: "proposed", startsAt: new Date(startsAt), endsAt: new Date(endsAt), mode: mode || "online", location: location || "", createdAt: new Date(), updatedAt: new Date() };
    const r = await Meetings.insertOne(doc);
    return res.json({ ok: true, id: r.insertedId.toString(), status: doc.status });
  } catch (e) { console.error("meetings:create", e); return res.status(500).json({ error: "server_error" }); }
});
app.get("/api/v2/meetings/me", authRequired, async (req, res) => {
  if (req.user.role !== "applicant") return res.status(403).json({ error: "forbidden" });
  const me = await findUserByEmail(req.user.email);
  const docs = await Meetings.find({ user: me._id }).sort({ _id: -1 }).toArray();
  const jobs = await Jobs.find({ _id: { $in: docs.map(d => d.job) } }).toArray();
  const jMap = new Map(jobs.map(j => [j._id.toString(), j]));
  const out = docs.map(m => ({
    id: m._id.toString(), status: m.status, startsAt: m.startsAt, endsAt: m.endsAt, mode: m.mode, location: m.location,
    job: (() => { const j = jMap.get(m.job.toString()); return j ? { id: j._id.toString(), title: j.title } : null; })(),
  }));
  res.json(out);
});
app.get("/api/v2/meetings", authRequired, requireRole("hr"), async (req, res) => {
  const { jobId } = req.query;
  const q = {};
  if (jobId) q.job = new ObjectId(String(jobId));
  const docs = await Meetings.find(q).sort({ _id: -1 }).toArray();
  const users = await Users.find({ _id: { $in: docs.map(d => d.user) } }).toArray();
  const uMap = new Map(users.map(u => [u._id.toString(), u]));
  const out = docs.map(m => ({
    id: m._id.toString(), status: m.status, startsAt: m.startsAt, endsAt: m.endsAt, mode: m.mode, location: m.location,
    applicant: (() => { const u = uMap.get(m.user.toString()); return u ? { email: u.email } : null; })(),
  }));
  res.json(out);
});
app.patch("/api/v2/meetings/:id", authRequired, requireRole("hr"), async (req, res) => {
  const patch = {};
  ["status","startsAt","endsAt","mode","location"].forEach(k => { if (req.body?.[k] !== undefined) patch[k] = ["startsAt","endsAt"].includes(k) ? new Date(req.body[k]) : req.body[k]; });
  patch.updatedAt = new Date();
  const r = await Meetings.updateOne({ _id: new ObjectId(req.params.id) }, { $set: patch });
  if (!r.matchedCount) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true, id: req.params.id, ...(patch.status ? { status: patch.status } : {}) });
});
app.delete("/api/v2/meetings/:id", authRequired, requireRole("hr"), async (req, res) => { await Meetings.deleteOne({ _id: new ObjectId(req.params.id) }); res.json({ ok: true }); });

// LinkedIn Dummy (HR)
app.post("/api/v2/linkedin/publish/:jobId", authRequired, requireRole("hr"), async (req, res) => {
  const { jobId } = req.params;
  const j = await Jobs.findOne({ _id: new ObjectId(jobId) });
  if (!j) return res.status(404).json({ error: "job_not_found" });
  const linkedinPostId = `li_${String(jobId).slice(-6)}`;
  await Jobs.updateOne({ _id: j._id }, { $set: { linkedinPostId, updatedAt: new Date() } });
  res.json({ ok: true, jobId, linkedinPostId, url: `https://www.linkedin.com/feed/update/${linkedinPostId}` });
});
app.delete("/api/v2/linkedin/publish/:jobId", authRequired, requireRole("hr"), async (req, res) => {
  await Jobs.updateOne({ _id: new ObjectId(req.params.jobId) }, { $unset: { linkedinPostId: "" }, $set: { updatedAt: new Date() } });
  res.json({ ok: true });
});
app.post("/api/v2/linkedin/import-applicant", authRequired, requireRole("hr"), async (req, res) => {
  try {
    const { profileUrl, email, name, birthdate, address, jobId } = req.body || {};
    if (!email) return res.status(400).json({ error: "missing_email" });
    const user = await ensureApplicant(email, { name, birthdate, address });
    let applicationId = null;
    if (jobId) {
      const job = await Jobs.findOne({ _id: new ObjectId(jobId) });
      if (job) {
        try {
          const doc = { job: job._id, user: user._id, status: "submitted", note: null, createdAt: new Date(), updatedAt: new Date(), source: "linkedin", sourceProfile: profileUrl || null };
          const r = await Applications.insertOne(doc); applicationId = r.insertedId.toString();
        } catch (e) {
          if (e?.code === 11000) { const existing = await Applications.findOne({ job: job._id, user: user._id }); applicationId = existing?._id?.toString() || null; }
          else throw e;
        }
      }
    }
    res.json({ ok: true, userId: user._id.toString(), ...(applicationId ? { applicationId } : {}) });
  } catch (e) { console.error("linkedin:import-applicant", e); res.status(500).json({ error: "server_error" }); }
});

// Agencies – jetzt ADMIN
async function agencyAuth(req, res, next) {
  const key = req.headers["x-api-key"];
  if (!key) return res.status(401).json({ error: "invalid_api_key" });
  const ag = await Agencies.findOne({ apiKey: key, active: { $ne: false } });
  if (!ag) return res.status(401).json({ error: "invalid_api_key" });
  req.agency = ag; next();
}
app.post("/api/v2/agencies", authRequired, requireRole("admin"), async (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: "missing_name" });
  const apiKey = randKey(24);
  const doc = { name, apiKey, active: true, permissions: ["jobs:read", "applications:read"], createdAt: new Date(), updatedAt: new Date() };
  const r = await Agencies.insertOne(doc);
  res.json({ ok: true, id: r.insertedId.toString(), apiKey });
});
app.get("/api/v2/agencies", authRequired, requireRole("admin"), async (_req, res) => {
  const list = await Agencies.find({}).sort({ _id: -1 }).toArray();
  res.json(list);
});
app.post("/api/v2/agencies/:id/rotate-key", authRequired, requireRole("admin"), async (req, res) => {
  const apiKey = randKey(24);
  const r = await Agencies.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { apiKey, updatedAt: new Date() } });
  if (!r.matchedCount) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true, apiKey });
});
app.delete("/api/v2/agencies/:id", authRequired, requireRole("admin"), async (req, res) => {
  await Agencies.deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ ok: true });
});
app.get("/api/agency/jobs", agencyAuth, async (_req, res) => {
  const docs = await Jobs.find({ open: { $ne: false } }).sort({ _id: -1 }).toArray();
  res.json(docs.map(j => ({ id: j._id.toString(), title: j.title, description: j.description, linkedinPostId: j.linkedinPostId ?? null })));
});
app.get("/api/agency/applications", agencyAuth, async (req, res) => {
  const { jobId } = req.query;
  const q = {};
  if (jobId) q.job = new ObjectId(String(jobId));
  const docs = await Applications.find(q).sort({ _id: -1 }).toArray();
  const users = await Users.find({ _id: { $in: docs.map(d => d.user) } }).toArray();
  const uMap = new Map(users.map(u => [u._id.toString(), u]));
  res.json(docs.map(a => ({ id: a._id.toString(), status: a.status, applicant: (() => { const u = uMap.get(a.user.toString()); return u ? { email: u.email } : null; })(), createdAt: a.createdAt })));
});

try { mountApiDocs(app); } catch (e) { console.error("[docs] mount failed, continuing without UI", e); }

function startGdprWorker() {
  console.log("[gdpr] worker started, interval 1h");
  setInterval(async () => { try { const now = new Date(); await Applications.deleteMany({ deleteAt: { $lte: now } }); } catch (e) { console.error("[gdpr] error", e); } }, 60*60*1000);
}
process.on("uncaughtException", (e) => console.error("uncaughtException", e));
process.on("unhandledRejection", (e) => console.error("unhandledRejection", e));

initDb().then(() => { startGdprWorker(); app.listen(PORT, () => console.log(`API listening on :${PORT}`)); }).catch(err => { console.error("DB init failed", err); process.exit(1); });
