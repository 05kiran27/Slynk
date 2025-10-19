const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateOtp } = require('../utils/otp');
const Joi = require('joi');
const crypto = require('crypto');
const redis = require('redis');
const { sendMail } = require('../utils/mailer');
const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/RefreshToken');

// Redis client setup
const redisClient = redis.createClient({ url: process.env.REDIS_URL });
redisClient.on('error', (err) => console.error('Redis Client Error', err));
(async () => { if (!redisClient.isOpen) await redisClient.connect(); })();

const ACCESS_TOKEN_EXP = '15m';
const REFRESH_TOKEN_EXP_DAYS = 30;
const PENDING_TTL_SECONDS = 15 * 60; // 15 min 
const REFRESH_TOKEN_EXP = 30*24*60*60;
const RESEND_COOLDOWN_SECONDS = 60; // 1 min

const generateTokens = async (userId, role) => {
  const accessToken = jwt.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXP });
  const refreshToken = crypto.randomBytes(64).toString('hex');

  // Store refresh token in DB
  await RefreshToken.create({
    userId,
    token: refreshToken,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXP_DAYS * 24 * 60 * 60 * 1000)
  });

  return { accessToken, refreshToken };
};


// --- Signup
exports.signup = async (req, res, next) => {
  try {
    const schema = Joi.object({
      name: Joi.string().required(),
      username: Joi.string().alphanum().min(3).max(30).required(),
      email: Joi.string().email().required(),
      phone: Joi.string().optional().allow('', null),
      password: Joi.string().min(6).required(),
      role: Joi.string().valid('innovator','developer','Investor','Admin').default('developer'),
    });

    const { value, error } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { name, username, email, phone, password, role } = value;
    const emailLower = email.toLowerCase();

    const existing = await User.findOne({ $or: [{ email: emailLower }, { username }] });
    if (existing) return res.status(400).json({ error: 'Email or username already exists' });

    const pendingKey = `pending:signup:${emailLower}`;
    const pendingRaw = await redisClient.get(pendingKey);
    if (pendingRaw) {
      const pending = JSON.parse(pendingRaw);
      if (pending.lastSentAt && (Date.now() - pending.lastSentAt)/1000 < RESEND_COOLDOWN_SECONDS) {
        return res.status(429).json({ error: `OTP recently sent. Try again after ${RESEND_COOLDOWN_SECONDS} seconds.` });
      }
    }

    const hashedPassword = await hashPassword(password);
    const { otp, hash: otpHash } = generateOtp();

    const pending = {
      name, username, email: emailLower, phone,
      password: hashedPassword, role,
      otpHash,
      otpExpiresAt: Date.now() + PENDING_TTL_SECONDS*1000,
      createdAt: Date.now(),
      lastSentAt: Date.now(),
      attempts: 0
    };

    await redisClient.set(pendingKey, JSON.stringify(pending), { EX: PENDING_TTL_SECONDS });

    await sendMail({
      to: emailLower,
      subject: 'Slynk OTP Verification',
      html: `<p>Your OTP is <strong>${otp}</strong>. It is valid for ${Math.floor(PENDING_TTL_SECONDS/60)} minutes.</p>`,
      text: `Your OTP is ${otp}. It is valid for ${Math.floor(PENDING_TTL_SECONDS/60)} minutes.`
    });

    res.status(201).json({ message: 'Signup initiated. Check your email for OTP.', email: emailLower, expiresInSeconds: PENDING_TTL_SECONDS });
  } catch (err) {
    next(err);
  }
};

// --- Verify OTP
exports.verifyOtp = async (req, res, next) => {
  try {
    const schema = Joi.object({ email: Joi.string().email().required(), otp: Joi.string().min(3).max(10).required() });
    const { value, error } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const emailLower = value.email.toLowerCase();
    const pendingKey = `pending:signup:${emailLower}`;
    const pendingRaw = await redisClient.get(pendingKey);
    if (!pendingRaw) return res.status(400).json({ error: 'No pending signup or OTP expired' });

    const pending = JSON.parse(pendingRaw);

    if (Date.now() > pending.otpExpiresAt) {
      await redisClient.del(pendingKey).catch(()=>{});
      return res.status(400).json({ error: 'OTP expired. Signup again.' });
    }

    const otpHash = crypto.createHash('sha256').update(value.otp).digest('hex');
    if (otpHash !== pending.otpHash) return res.status(400).json({ error: 'Invalid OTP' });

    // Create user
    const userDoc = new User({ ...pending, isEmailVerified: true });
    await userDoc.save();
    await redisClient.del(pendingKey).catch(()=>{});

    const { accessToken, refreshToken } = await generateTokens(userDoc._id, userDoc.role);

    res.cookie('token', accessToken, { httpOnly: true, secure: true, sameSite: 'Strict', maxAge: 15*60*1000 });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'Strict', maxAge: REFRESH_TOKEN_EXP*1000 });

    res.json({ message: 'Email verified and account created', userId: userDoc._id });
  } catch (err) {
    next(err);
  }
};

// --- Resend OTP
exports.resendOtp = async (req, res, next) => {
  try {
    const schema = Joi.object({ email: Joi.string().email().required() });
    const { value, error } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const emailLower = value.email.toLowerCase();
    const pendingKey = `pending:signup:${emailLower}`;
    const pendingRaw = await redisClient.get(pendingKey);
    if (!pendingRaw) return res.status(400).json({ error: 'No pending signup or OTP expired' });

    const pending = JSON.parse(pendingRaw);

    if (pending.lastSentAt && (Date.now() - pending.lastSentAt)/1000 < RESEND_COOLDOWN_SECONDS) {
      return res.status(429).json({ error: `OTP recently sent. Try again after ${RESEND_COOLDOWN_SECONDS} seconds.` });
    }

    const { otp, hash: newHash } = generateOtp();
    pending.otpHash = newHash;
    pending.otpExpiresAt = Date.now() + PENDING_TTL_SECONDS*1000;
    pending.lastSentAt = Date.now();
    pending.attempts = 0;

    await redisClient.set(pendingKey, JSON.stringify(pending), { EX: PENDING_TTL_SECONDS });

    await sendMail({
      to: emailLower,
      subject: 'Slynk OTP Verification - Resend',
      html: `<p>Your new OTP is <strong>${otp}</strong>. It is valid for ${Math.floor(PENDING_TTL_SECONDS/60)} minutes.</p>`,
      text: `Your new OTP is ${otp}. It is valid for ${Math.floor(PENDING_TTL_SECONDS/60)} minutes.`
    });

    res.json({ message: 'OTP resent successfully.' });
  } catch (err) { next(err); }
};

// --- Login
exports.login = async (req, res, next) => {
  try {
    console.log(req);
    const schema = Joi.object({ email: Joi.string().email().required(), password: Joi.string().required() });
    const { value, error } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const user = await User.findOne({ email: value.email.toLowerCase() });
    console.log("user -> ", user);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await comparePassword(value.password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    // if (!user.isEmailVerified) return res.status(403).json({ error: 'Email not verified' });

    const { accessToken, refreshToken } = await generateTokens(user._id, user.role);

    res.cookie('token', accessToken, { httpOnly: true, secure: true, sameSite: 'Strict', maxAge: 15*60*1000 });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'Strict', maxAge: REFRESH_TOKEN_EXP*1000 });

    res.json({ message: 'Login successful', userId: user._id });
  } catch (err) { next(err); }
};

// --- Logout

exports.logout = (req, res) => {
  try {
    console.log("req.cookies -> ", req.cookies);
    const token = req.cookies?.token;
    const refreshToken = req.cookies?.refreshToken;

    if (!token || !refreshToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Clear cookies
    res.clearCookie('token', { httpOnly: true, secure: false });
    res.clearCookie('refreshToken', { httpOnly: true, secure: false });

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};





// --- Refresh Token

exports.refreshToken = async (req, res, next) => {
  try {
    const oldToken = req.cookies.refreshToken;
    if (!oldToken) return res.status(401).json({ error: 'No refresh token provided' });

    const dbToken = await RefreshToken.findOne({ token: oldToken });
    if (!dbToken || dbToken.expiresAt < new Date()) {
      if (dbToken) await dbToken.deleteOne(); // Remove expired token
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(dbToken.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });

    // Delete old refresh token
    await dbToken.deleteOne();

    const { accessToken, refreshToken } = await generateTokens(user._id, user.role);

    res.cookie('token', accessToken, { httpOnly: true, secure: true, sameSite: 'Strict', maxAge: 15*60*1000 });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'Strict', maxAge: REFRESH_TOKEN_EXP_DAYS*24*60*60*1000 });

    res.json({ accessToken });
  } catch (err) { next(err); }
};
