// models/Comment.js
const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetModel: { type: String, required: true, enum: ['Post','Project','Comment'], index: true },
  target: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  content: { type: String, required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  likesCount: { type: Number, default: 0 },
  repliesCount: { type: Number, default: 0 }
}, { timestamps: true });

CommentSchema.index({ targetModel: 1, target: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', CommentSchema);
