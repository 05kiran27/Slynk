// src/models/Follower.js
// optional mirror collection (not required if you query Following), but provided if you prefer separate collection
const mongoose = require('mongoose');

const FollowerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // the user being followed
  follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // the follower
  createdAt: { type: Date, default: Date.now }
});

FollowerSchema.index({ user: 1, follower: 1 }, { unique: true });

module.exports = mongoose.model('Follower', FollowerSchema);
