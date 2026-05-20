const jwt = require('jsonwebtoken');

const DEV_FALLBACK_SECRET = 'development-local-secret';

function resolveJwtSecret() {
  const explicitSecret = process.env.JWT_SECRET;
  const env = process.env.NODE_ENV || 'development';

  if (explicitSecret) {
    return explicitSecret;
  }

  if (env === 'development') {
    console.warn('WARNING: JWT_SECRET is not set. Using a development-only fallback secret.');
    return DEV_FALLBACK_SECRET;
  }

  throw new Error('JWT_SECRET must be configured when NODE_ENV is not development.');
}

function assertJwtSecretIsConfigured() {
  resolveJwtSecret();
}

function createToken(user) {
  const secret = resolveJwtSecret();
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, secret, { expiresIn: '12h' });
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing auth token' });
  }

  try {
    req.user = jwt.verify(token, resolveJwtSecret());
    return next();
  } catch (_error) {
    return res.status(401).json({ error: 'Invalid auth token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  return next();
}

module.exports = {
  createToken,
  requireAuth,
  requireAdmin,
  assertJwtSecretIsConfigured,
};
