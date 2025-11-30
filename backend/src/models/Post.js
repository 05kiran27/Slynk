// models/Post.js
const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema({
  url: String,
  type: { type: String } // image, video, document
}, { _id: false });

const PostSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['normal', 'project'], default: 'normal' },
  content: { type: String, trim: true },
  media: [MediaSchema],

  // Project-specific metadata (kept small; full application details in Application)
  projectTitle: { type: String, trim: true },
  projectDescription: { type: String, trim: true },
  skillsRequired: [{ type: String, trim: true }],
  applicationDeadline: { type: Date },

  // denormalized counters (atomic $inc on create/remove)
  applicantsCount: { type: Number, default: 0, index: true },
  likesCount: { type: Number, default: 0, index: true },
  commentsCount: { type: Number, default: 0 },

  visibility: { type: String, enum: ['public','private','restricted'], default: 'public' }
}, { timestamps: true });

// indexes for feed queries
PostSchema.index({ author: 1, createdAt: -1 });
PostSchema.index({ visibility: 1, createdAt: -1 });
PostSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('Post', PostSchema);
