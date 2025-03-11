const mongoose = require('mongoose');

const VoiceMasterSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  categoryId: { type: String, required: true },
  channelId: { type: String, required: true },
  ownerId: { type: String, required: true }, 
  users: { type: [String], default: [] }, 
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('VoiceMaster', VoiceMasterSchema);