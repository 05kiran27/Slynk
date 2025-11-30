const rateLimit = require('express-rate-limit');

exports.signupLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many signup attempts, try again later' }
});

exports.loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, try again later' }
});
