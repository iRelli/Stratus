const mongoose = require('mongoose');
const Levels = require('discord-xp');
const Moderation = require('../models/Moderation');
const WebSocket = require('ws');
require('dotenv').config();

module.exports = {
  name: 'ready',
  async execute(client) {
    console.log(`🚀 Stratus is online as ${client.user.tag}`);

    // ✅ Connect to MongoDB
    try {
      await mongoose.connect(process.env.MONGO_URI, {});
      console.log('✅ Connected to MongoDB');
      Levels.setURL(process.env.MONGO_URI);
    } catch (err) {
      console.error('❌ MongoDB Connection Error:', err);
    }

    // ✅ Ensure Default Configuration for All Guilds
    for (const guild of client.guilds.cache.values()) {
      await ensureGuildConfig(guild.id);
    }
  },
};

async function ensureGuildConfig(guildId) {
  try {
    let moderationData = await Moderation.findOne({ guildId });

    if (!moderationData) {
      moderationData = new Moderation({
        guildId,
        logChannelId: null,
        warningLimit: 5,
        antiRaidEnabled: false,
        antiRaidThreshold: 5,
        antiRaidAction: 'kick',
        antiRaidTimeframe: 10,
        rateLimitEnabled: false,
        rateLimitThreshold: 5,
        rateLimitTimeframe: 5,
        rateLimitDuration: 10,
        messageFilterEnabled: false,
        filterLevel: 'normal',
        levelingEnabled: false,
        xpMultiplier: 1.0,
      });

      await moderationData.save();
      console.log(
        `✅ Created default moderation settings for guild: ${guildId}`,
      );
    }
  } catch (error) {
    console.error(
      `❌ Error ensuring moderation settings for ${guildId}:`,
      error,
    );
  }
}
