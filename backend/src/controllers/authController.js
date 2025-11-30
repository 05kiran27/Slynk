// controllers/authController.js

const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateOtp } = require('../utils/otp');
const Joi = require('joi');
const crypto = require('crypto');
const redis = require('redis');
const jwt = require('jsonwebtoken');
const { sendMail, renderOtpTemplate } = require("../utils/mailer");




// ---------------------------------------------------------------------
// Redis client setup (single long-lived connection per process)
// ---------------------------------------------------------------------
const redisClient = redis.createClient({ url: process.env.REDIS_URL });

redisClient.on('error', (err) => {
  console.error('Redis Client Error', err);
});

// fire-and-forget connect; caller functions guard on isOpen
(async () => {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
      console.log('Redis connected');
    } catch (err) {
      console.error('Failed to connect Redis', err);
    }
  }
})();

// ---------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------
const ACCESS_TOKEN_EXP = '15m';
const REFRESH_TOKEN_EXP_DAYS = 30;
const PENDING_TTL_SECONDS = 15 * 60;      // 15 min
const RESEND_COOLDOWN_SECONDS = 60;       // 1 min
const REFRESH_TOKEN_COOKIE_SEC = REFRESH_TOKEN_EXP_DAYS * 24 * 60 * 60; // in seconds

const isProd = process.env.NODE_ENV === 'production';

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'Strict',
  maxAge: 15 * 60 * 1000, // 15 minutes in ms
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'Strict',
  maxAge: REFRESH_TOKEN_COOKIE_SEC * 1000,
};

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
const generateTokens = async (userId, role) => {
  const accessToken = jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXP }
  );

  const refreshToken = crypto.randomBytes(64).toString('hex');

  await RefreshToken.create({
    userId,
    token: refreshToken,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXP_DAYS * 24 * 60 * 60 * 1000),
  });

  return { accessToken, refreshToken };
};

const ensureRedis = async () => {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
    } catch (err) {
      console.error('Redis reconnect failed', err);
    }
  }
};

// ---------------------------------------------------------------------
// Signup
// ---------------------------------------------------------------------
exports.signup = async (req, res, next) => {
  try {
    const schema = Joi.object({
      name: Joi.string().required(),
      username: Joi.string().alphanum().min(3).max(30).required(),
      email: Joi.string().email().required(),
      phone: Joi.string().optional().allow('', null),
      password: Joi.string().min(6).required(),
      role: Joi.string()
        .valid('innovator', 'developer', 'investor', 'admin')
        .default('developer'),
    });

    const { value, error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, username, email, phone, password } = value;
    const role = (value.role || 'developer').toLowerCase();
    const emailLower = email.toLowerCase();

    // check for existing user (lean to reduce memory)
    const existing = await User.findOne({
      $or: [{ email: emailLower }, { username }],
    }).lean();

    if (existing) {
      return res.status(400).json({ error: 'Email or username already exists' });
    }

    // ensure redis connection
    await ensureRedis();

    const pendingKey = `pending:signup:${emailLower}`;
    const pendingRaw = await redisClient.get(pendingKey);

    if (pendingRaw) {
      const pending = JSON.parse(pendingRaw);
      if (
        pending.lastSentAt &&
        (Date.now() - pending.lastSentAt) / 1000 < RESEND_COOLDOWN_SECONDS
      ) {
        return res.status(429).json({
          error: `OTP recently sent. Try again after ${RESEND_COOLDOWN_SECONDS} seconds.`,
        });
      }
    }

    // create hashed password and OTP
    const hashedPassword = await hashPassword(password);
    const { otp, hash: otpHash } = generateOtp(); // otp is a short code (string or number)

    const pending = {
      name,
      username,
      email: emailLower,
      phone,
      password: hashedPassword,
      role,
      otpHash,
      otpExpiresAt: Date.now() + PENDING_TTL_SECONDS * 1000,
      createdAt: Date.now(),
      lastSentAt: Date.now(),
      attempts: 0,
    };

    // Save pending signup in Redis (short-lived)
    await redisClient.set(pendingKey, JSON.stringify(pending), {
      EX: PENDING_TTL_SECONDS,
    });

    // Build a production-grade HTML email (white + blue theme) and plain text fallback.
    const html = `
      <!doctype html>
      <html>
        <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
        <body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;">
          <center style="width:100%;background:#f3f6fb;padding:24px 0;">
            <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;margin:0 auto;background:#ffffff;border-radius:8px;box-shadow:0 8px 24px rgba(13,110,253,0.08);overflow:hidden;">
              <tr>
                <h2>Slynk</h2>
              </tr>

              <tr>
                <td style="padding:24px 28px;">
                  <h1 style="margin:0 0 12px 0;font-size:22px;color:#0b5ed7;">Verify your email</h1>
                  <p style="margin:0 0 18px 0;font-size:15px;color:#495057;line-height:1.45;">
                    Use the code below to complete your Slynk account verification. This code is valid for <strong>15 minutes</strong>.
                  </p>

                  <div style="width:100%;margin-top:18px;text-align:center;">
                    <div style="display:inline-block;padding:18px;border-radius:8px;background:#f8fafc;border:1px solid #e9f2ff;">
                      <p style="margin:0;font-size:28px;letter-spacing:4px;color:#0d6efd;font-weight:700;">${otp}</p>
                      <p style="margin:8px 0 0 0;font-size:13px;color:#6c757d;">One-time passcode — do not share it with anyone.</p>
                    </div>
                  </div>

                  

                  <p style="margin:24px 0 0 0;font-size:13px;color:#6c757d;">
                    If you did not request this, you can safely ignore this email.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #eef3ff;">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      <td style="font-size:12px;color:#6c757d;">
                        © ${new Date().getFullYear()} Slynk. All rights reserved.
                      </td>
                      
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </center>
        </body>
      </html>
    `;

    const text = `Slynk — Email verification

Your OTP is: ${otp}
It is valid for ${Math.floor(PENDING_TTL_SECONDS / 60)} minutes.

If you didn't request this, ignore this message or contact support.`;

    // Send email (uses your existing sendMail util which expects html & text)
    await sendMail({
      to: emailLower,
      subject: 'Slynk OTP Verification',
      html,
      text,
    });

    // respond (do not return otp to client)
    return res.status(201).json({
      message: 'Signup initiated. Check your email for OTP.',
      email: emailLower,
      expiresInSeconds: PENDING_TTL_SECONDS,
    });
  } catch (err) {
    next(err);
  }
};


// ---------------------------------------------------------------------
// Verify OTP
// ---------------------------------------------------------------------
exports.verifyOtp = async (req, res, next) => {
  try {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      otp: Joi.string().min(3).max(10).required(),
    });

    const { value, error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const emailLower = value.email.toLowerCase();
    await ensureRedis();

    const pendingKey = `pending:signup:${emailLower}`;
    const pendingRaw = await redisClient.get(pendingKey);
    if (!pendingRaw) {
      return res.status(400).json({ error: 'No pending signup or OTP expired' });
    }

    const pending = JSON.parse(pendingRaw);

    // basic attempt throttling
    if (pending.attempts >= 5) {
      await redisClient.del(pendingKey).catch(() => {});
      return res.status(429).json({ error: 'Too many attempts. Signup again.' });
    }

    if (Date.now() > pending.otpExpiresAt) {
      await redisClient.del(pendingKey).catch(() => {});
      return res.status(400).json({ error: 'OTP expired. Signup again.' });
    }

    const otpHash = crypto
      .createHash('sha256')
      .update(value.otp)
      .digest('hex');

    if (otpHash !== pending.otpHash) {
      pending.attempts = (pending.attempts || 0) + 1;
      await redisClient.set(pendingKey, JSON.stringify(pending), {
        EX: PENDING_TTL_SECONDS,
      });
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // OTP correct -> create user with whitelisted fields only
    const { name, username, email, phone, password, role } = pending;
    const userDoc = new User({
      name,
      username,
      email,
      phone,
      password,
      role,
      verified: true, // matches your new User schema field
    });

    await userDoc.save();
    await redisClient.del(pendingKey).catch(() => {});

    const { accessToken, refreshToken } = await generateTokens(
      userDoc._id,
      userDoc.role
    );

    res.cookie('token', accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.json({
      message: 'Email verified and account created',
      userId: userDoc._id,
    });
  } catch (err) {
    next(err);
  }
};


// ---------------------------------------------------------------------
// Resend OTP
// ---------------------------------------------------------------------
exports.resendOtp = async (req, res, next) => {
  try {
    const schema = Joi.object({
      email: Joi.string().email().required(),
    });

    const { value, error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const emailLower = value.email.toLowerCase();
    await ensureRedis();

    const pendingKey = `pending:signup:${emailLower}`;
    const pendingRaw = await redisClient.get(pendingKey);

    if (!pendingRaw) {
      return res
        .status(400)
        .json({ error: "No pending signup or OTP expired" });
    }

    const pending = JSON.parse(pendingRaw);

    // cooldown check
    if (
      pending.lastSentAt &&
      (Date.now() - pending.lastSentAt) / 1000 < RESEND_COOLDOWN_SECONDS
    ) {
      return res.status(429).json({
        error: `OTP recently sent. Try again after ${RESEND_COOLDOWN_SECONDS} seconds.`,
      });
    }

    // regenerate OTP
    const { otp, hash: newHash } = generateOtp();
    pending.otpHash = newHash;
    pending.otpExpiresAt = Date.now() + PENDING_TTL_SECONDS * 1000;
    pending.lastSentAt = Date.now();
    pending.attempts = 0;

    // save updated pending signup
    await redisClient.set(pendingKey, JSON.stringify(pending), {
      EX: PENDING_TTL_SECONDS,
    });

    // build HTML + text email using the template
    const html = renderOtpTemplate(otp);
    const text = `Your new OTP is ${otp}. It is valid for ${Math.floor(
      PENDING_TTL_SECONDS / 60
    )} minutes.`;

    // send email
    await sendMail({
      to: emailLower,
      subject: "Slynk OTP Verification - Resend",
      html,
      text,
    });

    return res.json({ message: "OTP resent successfully." });
  } catch (err) {
    next(err);
  }
};


// ---------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------
exports.login = async (req, res, next) => {
  try {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    });
    const { value, error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const emailLower = value.email.toLowerCase();

    // load full user (password included)
    const user = await User.findOne({ email: emailLower });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await comparePassword(value.password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // optional: enforce verified email
    // if (!user.verified) {
    //   return res.status(403).json({ error: 'Email not verified' });
    // }

    const { accessToken, refreshToken } = await generateTokens(
      user._id,
      user.role
    );

    res.cookie('token', accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.json({ message: 'Login successful', userId: user._id });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------
// controllers/authController.js

exports.logout = async (req, res) => {
  try {
    // debug: print request metadata to help diagnose "otp" validation being triggered
    console.debug('[logout] path=%s method=%s cookies=%o body=%o headers(x-refresh-token)=%s',
      req.path, req.method, req.cookies || {}, req.body || {}, req.headers['x-refresh-token'] || '');

    // Accept refresh token from cookie OR a header (best-effort)
    const cookieRefresh = req.cookies?.refreshToken;
    const headerRefresh = req.headers['x-refresh-token'] || null;
    const refreshToken = cookieRefresh || headerRefresh;

    if (refreshToken) {
      try {
        await RefreshToken.deleteOne({ token: refreshToken });
        console.debug('[logout] refresh token revoked');
      } catch (e) {
        // don't fail logout on DB error
        console.warn('[logout] refresh token delete failed:', e && e.message);
      }
    } else {
      console.debug('[logout] no refresh token found in cookie or header');
    }

    // Clear cookies (must match attributes used when set)
    res.clearCookie('token', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'Strict',
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'Strict',
    });

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('[logout] error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// ---------------------------------------------------------------------
// Refresh Token
// ---------------------------------------------------------------------
exports.refreshToken = async (req, res, next) => {
  try {
    const oldToken = req.cookies?.refreshToken;
    if (!oldToken) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    const dbToken = await RefreshToken.findOne({ token: oldToken });
    if (!dbToken || dbToken.expiresAt < new Date()) {
      if (dbToken) {
        await dbToken.deleteOne().catch(() => {});
      }
      return res
        .status(401)
        .json({ error: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(dbToken.userId);
    if (!user) {
      await dbToken.deleteOne().catch(() => {});
      return res.status(401).json({ error: 'User not found' });
    }

    // rotate refresh token: delete old, issue new pair
    await dbToken.deleteOne();

    const { accessToken, refreshToken } = await generateTokens(
      user._id,
      user.role
    );

    res.cookie('token', accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    // You can also return accessToken if you want SPA to read it explicitly
    return res.json({ accessToken });
  } catch (err) {
    next(err);
  }
};
