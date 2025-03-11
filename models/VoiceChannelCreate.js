const mongoose = require('mongoose');

const VoiceChannelCreateSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  name: { type: String, required: true },
  limit: { type: Number, required: false },
  categoryId: { type: String, required: true },
});

module.exports = mongoose.model('VoiceChannelCreate', VoiceChannelCreateSchema);
