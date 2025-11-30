// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  username: { type: String, required: true, trim: true, unique: true, lowercase: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  password: { type: String, required: true }, // hashed

  role: {
    type: String,
    enum: ['innovator', 'developer', 'investor', 'admin'],
    default: 'developer'
  },

  phone: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
    validate: {
      validator: function (v) {
        return !v || /^\+?[1-9]\d{9,14}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },

  headline: { type: String, default: '' },
  avatar: { type: String, default: '' },

  isPrivateAccount: { type: Boolean, default: false },
  profileVisible: { type: Boolean, default: true },
  messagePrivacy: { type: String, enum: ['connections', 'everyone'], default: 'connections' },

  lastSeen: { type: Date, default: Date.now },
  verified: { type: Boolean, default: false },

  // cached counters for quick reads
  followersCount: { type: Number, default: 0, index: true },
  followingCount: { type: Number, default: 0 },
  projectsCount: { type: Number, default: 0 },
  postsCount: { type: Number, default: 0 }
}, { timestamps: true });

// Text search for quick name/username search; keep moderate fields
UserSchema.index({ name: 'text', username: 'text' }, { weights: { username: 3, name: 1 } });

// Shard hint: consider hashing _id or username when enabling sharding
module.exports = mongoose.model('User', UserSchema);
