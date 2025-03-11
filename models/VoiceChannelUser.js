const mongoose = require('mongoose');

const VoiceChannelUserSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  userId: { type: String, required: true },
});

module.exports = mongoose.model('VoiceChannelUser', VoiceChannelUserSchema);s