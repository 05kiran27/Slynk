// models/Application.js
const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  projectOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // denormalized for quick owner queries
  developer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' }, // optional link to originating post (if project posted as post)
  coverLetter: { type: String, default: '' },
  resumeUrl: { type: String, default: '' },
  status: { type: String, enum: ['pending','accepted','rejected','withdrawn'], default: 'pending', index: true },
  appliedAt: { type: Date, default: Date.now, index: true },
  actedAt: { type: Date },
  actedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// prevent duplicate application from same developer for same project
ApplicationSchema.index({ project: 1, developer: 1 }, { unique: true });
// accelerate owner workflows
ApplicationSchema.index({ projectOwner: 1, status: 1, appliedAt: -1 });
ApplicationSchema.index({ developer: 1, status: 1, appliedAt: -1 });

module.exports = mongoose.model('Application', ApplicationSchema);
