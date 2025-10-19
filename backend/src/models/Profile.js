// src/models/Profile.js
const mongoose = require('mongoose');

const ExperienceSchema = new mongoose.Schema({
  title: String,
  company: String,
  startDate: Date,
  endDate: Date,
  current: { type: Boolean, default: false },
  description: String,
  location: String,
}, { _id: true });

const EducationSchema = new mongoose.Schema({
  school: String,
  degree: String,
  fieldOfStudy: String,
  startDate: Date,
  endDate: Date,
  description: String,
}, { _id: true });

const ProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  bio: { type: String, default: '' },
  headline: { type: String, default: '' },
  location: { type: String, default: '' },
  website: { type: String, default: '' },
  social: {
    github: String,
    linkedin: String,
    twitter: String,
    portfolio: String,
  },
  skills: [{ type: String }],
  experiences: [ExperienceSchema],
  education: [EducationSchema],
  // public metrics (cached)
  followersCount: { type: Number, default: 0 },
  followingCount: { type: Number, default: 0 },
  connectionsCount: { type: Number, default: 0 },
  projectsCount: { type: Number, default: 0 },
  // visibility / preferences
  showEmail: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Profile', ProfileSchema);
