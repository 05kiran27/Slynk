// src/models/Connection.js
const mongoose = require('mongoose');

const ConnectionSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // who sent the request
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // who receives it
  status: { type: String, enum: ['pending','accepted','rejected','cancelled','blocked'], default: 'pending' },
  message: { type: String }, // optional personalized message
  actionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who last acted (accepted/rejected)
  // timestamps: createdAt = request time, updatedAt = last action time
}, { timestamps: true });

// prevent duplicate requests (unique pair regardless of order?)  
// For LinkedIn behavior we want one Connection between two users, direction matters for pending.
ConnectionSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// If you need to prevent reversed duplicates (A->B and B->A), you must check in application logic or use a canonical pair key:
// Example: a computed 'pairKey' where pairKey = min(id1,id2)+'_'+max(id1,id2) and unique index on pairKey to enforce single connection record per pair.

module.exports = mongoose.model('Connection', ConnectionSchema);
