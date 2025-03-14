const mongoose = require('mongoose');

const VoiceChannelCreateSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  ownerId: { type: String, required: true },
  channelId: { type: String, required: true },
  categoryId: { type: String, required: true },
});

module.exports = mongoose.model('VoiceChannelCreate', VoiceChannelCreateSchema);
