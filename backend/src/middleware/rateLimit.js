const rateLimit = require('express-rate-limit');

exports.signupLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 10, // max 10 requests per IP
  message: 'Too many signup attempts, try again later',
});

exports.loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // max 20 requests per IP
  message: 'Too many login attempts, try again later',
});
