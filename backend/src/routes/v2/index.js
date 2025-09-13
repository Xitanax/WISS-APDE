// backend/src/routes/v2/index.js
import { Router } from 'express';
import users from './users.js';
import jobs from './jobs.js';

const r = Router();
r.use('/users', users);
r.use('/jobs', jobs);

export default r;
