// models/Connection.js
const mongoose = require('mongoose');

const ConnectionSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['pending','accepted','rejected','cancelled','blocked'], default: 'pending', index: true },
  message: { type: String },
  actionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pairKey: { type: String, index: true, unique: true } // canonical pair key to prevent reversed duplicates
}, { timestamps: true });

// create canonical pairKey: min(id)+ '_' + max(id)
ConnectionSchema.pre('validate', function(next) {
  if (this.requester && this.recipient) {
    const a = this.requester.toString();
    const b = this.recipient.toString();
    this.pairKey = a < b ? `${a}_${b}` : `${b}_${a}`;
  }
  next();
});

// unique index on pairKey prevents both A->B and B->A duplicates
module.exports = mongoose.model('Connection', ConnectionSchema);
