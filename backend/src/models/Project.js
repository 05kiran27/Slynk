// src/models/Project.js
const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  slug: { type: String, index: true }, // generated from title for friendly URLs
  description: { type: String },
  repoUrl: { type: String },
  demoUrl: { type: String },
  tech: [{ type: String }],
  collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  visibility: { type: String, enum: ['public','private','restricted'], default: 'public' },
  likesCount: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },
  status: { type: String, enum: ['active','archived','draft'], default: 'active' },
  featured: { type: Boolean, default: false },
  applicantsCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);
