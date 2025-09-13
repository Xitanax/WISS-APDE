// robuste Auth: Bearer-Header ODER Cookie ODER x-access-token
import jwt from 'jsonwebtoken';

function getTokenFromReq(req){
  const h = req.headers?.authorization || req.get?.('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (m) return m[1];
  if (req.cookies?.token) return req.cookies.token;
  if (req.headers?.['x-access-token']) return req.headers['x-access-token'];
  return null;
}

export function auth(required = true){
  return (req, res, next) => {
    const tok = getTokenFromReq(req);
    if (!tok) {
      if (required) return res.status(401).json({ error: 'Missing token' });
      req.user = null; return next();
    }
    try {
      req.user = jwt.verify(tok, process.env.JWT_SECRET || 'dev-secret');
      return next();
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

export const requireRole = (...roles) => [
  auth(true),
  (req, res, next) => roles.includes(req.user?.role)
    ? next()
    : res.status(403).json({ error: 'Forbidden' })
];
