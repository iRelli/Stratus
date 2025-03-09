const { Schema, model } = require('mongoose');

const afkSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  reason: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = model('AFK', afkSchema);
