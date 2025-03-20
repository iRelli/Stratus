const mongoose = require('mongoose');

const VoiceChannelCreateSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  ownerId: { type: String },
  channelId: { type: String, required: true },
  categoryId: { type: String, required: true },
  generator: { type: Boolean, default: false },
});

module.exports = mongoose.model('VoiceChannelCreate', VoiceChannelCreateSchema);
