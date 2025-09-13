// src/lib/auth.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Liest JWT aus Authorization-Header und hängt Nutzerinfos an req.user
export function requireAuth(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const [, token] = h.split(' ');
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { email: payload.email, role: payload.role || 'guest' };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Erlaubt nur bestimmte Rollen
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Missing token' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}
