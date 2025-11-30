// models/Like.js
const mongoose = require('mongoose');

const LikeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetModel: { type: String, required: true, enum: ['Post','Project','Comment','User'], index: true },
  target: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }
}, { timestamps: true });

// unique constraint to prevent duplicates; handle duplicate-key errors in app
LikeSchema.index({ user: 1, targetModel: 1, target: 1 }, { unique: true });

module.exports = mongoose.model('Like', LikeSchema);
