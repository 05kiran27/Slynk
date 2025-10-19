// src/models/Application.js
const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  projectOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // denormalized for quicker owner queries
  developer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  coverLetter: { type: String, default: '' },
  resumeUrl: { type: String }, // optional
  status: { type: String, enum: ['pending','accepted','rejected','withdrawn'], default: 'pending', index: true },
  appliedAt: { type: Date, default: Date.now },
  actedAt: { type: Date }, // when accepted/rejected
  actedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who accepted/rejected
}, { timestamps: true });

// prevent duplicate application from same developer for same project
ApplicationSchema.index({ project: 1, developer: 1 }, { unique: true });

module.exports = mongoose.model('Application', ApplicationSchema);
