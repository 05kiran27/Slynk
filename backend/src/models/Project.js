// models/Project.js
const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  slug: { type: String, index: true },
  description: { type: String, default: '' },
  repoUrl: { type: String, default: '' },
  demoUrl: { type: String, default: '' },
  tech: [{ type: String }],
  collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  visibility: { type: String, enum: ['public','private','restricted'], default: 'public' },
  likesCount: { type: Number, default: 0, index: true },
  commentsCount: { type: Number, default: 0 },
  status: { type: String, enum: ['active','archived','draft'], default: 'active' },
  featured: { type: Boolean, default: false },
  applicantsCount: { type: Number, default: 0, index: true },

  // optional team reference (created when innovator accepts devs)
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' } // optional, define Team model later if required
}, { timestamps: true });

// common indexes
ProjectSchema.index({ owner: 1, createdAt: -1 });
ProjectSchema.index({ visibility: 1, createdAt: -1 });

module.exports = mongoose.model('Project', ProjectSchema);
