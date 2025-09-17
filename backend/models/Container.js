const mongoose = require('mongoose');

const containerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  containerId: { type: String, required: true },
  port: { type: Number, required: true },
  status: { type: String, default: 'running' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

module.exports = mongoose.model('Container', containerSchema);
