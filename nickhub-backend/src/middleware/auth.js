const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/db');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = header.split(' ')[1];
  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
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

// Gate any action that should only be available to paying subscribers.
// Admins bypass this check.
function requireActiveSubscription(req, res, next) {
  if (req.user.role === 'ADMIN') return next();
  if (!['ACTIVE', 'TRIALING'].includes(req.user.subscriptionStatus)) {
    return res.status(402).json({ error: 'An active subscription is required for this action.' });
  }
  next();
}

module.exports = { requireAuth, requireRole, requireActiveSubscription };
