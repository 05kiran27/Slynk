// models/Notification.js
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // recipient
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who triggered it
  verb: { type: String, required: true }, // liked, commented, applied, invited, accepted, etc.
  unread: { type: Boolean, default: true, index: true },
  targetModel: { type: String, enum: ['Post','Project','Comment','Connection','User','Application','Team'], default: null },
  target: { type: mongoose.Schema.Types.ObjectId, default: null },
  meta: { type: mongoose.Schema.Types.Mixed },
  groupKey: { type: String } // optional grouping key for aggregation
}, { timestamps: true });

// query patterns
NotificationSchema.index({ user: 1, unread: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, createdAt: -1 });

// retention: trim older notifications with a worker; keep Notification doc small
module.exports = mongoose.model('Notification', NotificationSchema);
