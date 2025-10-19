const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  username: { type: String, required: true, trim: true, unique: true, lowercase: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  password: { type: String, required: true }, // hashed password

  // Roles: defined exactly as requested
  role: {
    type: String,
    enum: ['innovator', 'developer', 'investor', 'admin'],
    default: 'developer'
  },

  // Optional phone number (unique)
  phone: {
    type: String,
    trim: true,
    unique: true,
    sparse: true, // allows null/undefined values without conflict
    validate: {
      validator: function (v) {
        // Basic E.164 pattern: + followed by 10–15 digits
        return !v || /^\+?[1-9]\d{9,14}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },

  // Profile snapshot
  headline: { type: String, default: '' },
  avatar: { type: String, default: '' }, // URL

  // Privacy controls
  profileVisible: { type: Boolean, default: true },
  messagePrivacy: { type: String, enum: ['connections', 'everyone'], default: 'connections' },

  // Preferences / flags
  isPrivateAccount: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  verified: { type: Boolean, default: false }
}, { timestamps: true });

// Indexes for quick search
UserSchema.index({ name: 'text', username: 'text', email: 1, phone: 1 });

module.exports = mongoose.model('User', UserSchema);
