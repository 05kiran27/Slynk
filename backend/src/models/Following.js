// models/Following.js
const mongoose = require('mongoose');

const FollowingSchema = new mongoose.Schema({
  follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  followee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  createdAt: { type: Date, default: Date.now }
});

// unique follow pair
FollowingSchema.index({ follower: 1, followee: 1 }, { unique: true });

module.exports = mongoose.model('Following', FollowingSchema);
