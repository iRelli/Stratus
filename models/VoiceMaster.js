const mongoose = require('mongoose');

const VoiceMasterSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  categoryId: { type: String, required: true },
  channelId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('VoiceMaster', VoiceMasterSchema);
