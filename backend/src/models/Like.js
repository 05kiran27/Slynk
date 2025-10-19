// src/models/Like.js
const mongoose = require('mongoose');

const LikeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // polymorphic target: either Post, Project, Comment etc.
  targetModel: { type: String, required: true, enum: ['Post','Project','Comment','User'] },
  target: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
}, { timestamps: true });

// prevent duplicate likes
LikeSchema.index({ user: 1, targetModel: 1, target: 1 }, { unique: true });

module.exports = mongoose.model('Like', LikeSchema);
