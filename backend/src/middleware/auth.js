const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.authenticate = async (req, res, next) => {
  try {
    // accept token from cookie or Authorization header "Bearer <token>"
    const cookieToken = req.cookies?.token;
    const headerToken = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null;
    const token = cookieToken || headerToken;

    if (!token) return res.status(401).json({ error: 'No token provided' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await User.findById(decoded.id).select('-password').lean();
    if (!user) return res.status(401).json({ error: 'Invalid token: user not found' });

    // attach lightweight user object to request
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Authentication error' });
  }
};
