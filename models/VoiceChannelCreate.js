const mongoose = require('mongoose');

const VoiceChannelCreateSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  ownerId: { type: String, required: true }, // User who owns the private voice channel
  channelId: { type: String, required: true }, // J2C voice channel ID
  categoryId: { type: String, required: true }, // ✅ Ensure category is saved
  channelName: { type: String, required: true, default: "{user}'s VC" }, // Default name
  limit: { type: Number, default: 0 }, // Voice channel user limit
});

module.exports = mongoose.model('VoiceChannelCreate', VoiceChannelCreateSchema);
