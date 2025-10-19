// src/models/Notification.js
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // who receives it
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who triggered the notification
  verb: { type: String, required: true }, // e.g. 'liked', 'commented', 'connected', 'followed', 'invited'
  unread: { type: Boolean, default: true },
  // optional reference to a resource (post, project, connection, comment, user)
  targetModel: { type: String, enum: ['Post','Project','Comment','Connection','User','ProjectInvite'], default: null },
  target: { type: mongoose.Schema.Types.ObjectId, default: null },
  meta: { type: mongoose.Schema.Types.Mixed }, // small JSON for display hints (e.g. preview text, count)
  // grouping: if you want to group notifications, include a group key
  groupKey: { type: String }, // optional, e.g. "post-<id>-likes"
}, { timestamps: true });

NotificationSchema.index({ user: 1, unread: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
