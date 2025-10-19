const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // type: normal or project
  type: {
    type: String,
    enum: ['normal', 'project'],
    default: 'normal',
  },

  // Common fields for both normal and project posts
  content: {
    type: String,
    trim: true,
  },

  media: [
    {
      url: String, // Image, video, or file URL
      type: String, // e.g., 'image', 'video', 'document'
    },
  ],

  // ====== Project specific fields ======
  projectTitle: {
    type: String,
    trim: true,
  },
  projectDescription: {
    type: String,
    trim: true,
  },
  skillsRequired: [
    {
      type: String,
      trim: true,
    },
  ],
  applicationDeadline: {
    type: Date,
  },
  applicants: [
    {
      developer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      coverLetter: {
        type: String,
      },
      appliedAt: {
        type: Date,
        default: Date.now,
      },
      status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending',
      },
    },
  ],

  // Likes and Comments (references)
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],

  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
    },
  ],

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Post', PostSchema);
