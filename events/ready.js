const mongoose = require('mongoose');
const { Client, GatewayDispatchEvents } = require('discord.js');
const Levels = require('discord-xp');
const Moderation = require('../models/Moderation');
const { cleanupEmptyVCs } = require('../utils/vmHandler');
const { initializeCacheCleanup } = require('../utils/cacheHandler');
const { LavaShark } = require("lavashark");
require('dotenv').config();
const loadLavalinkEvents = require('../utils/lavalinkHandler');

module.exports = {
  name: 'ready',
  async execute(client) {

    client.user.setPresence({
      status: 'dnd',
      activities: [
        {
          name: 'Debugging',
          type: 'WATCHING',
        },
      ],
    });

    const lavashark = new LavaShark({
      nodes: [
          {
              id: 'Node 1',
              hostname: '67.220.85.182',
              port: 6539,
              password: 'youshallnotpass'
          }
      ],
      sendWS: (guildId, payload) => { client.guilds.cache.get(guildId)?.shard.send(payload); }
  });

  client.lavashark = lavashark;

  client.lavashark.start(client.user.id);

  client.on('raw', (packet) => client.lavashark.handleVoiceUpdate(packet));

    
    loadLavalinkEvents(client);

    try {
      await mongoose.connect(process.env.MONGO_URI, {});
      console.log('✅ Connected to MongoDB');
      Levels.setURL(process.env.MONGO_URI);
    } catch (err) {
      console.error('❌ MongoDB Connection Error:', err);
    }

    for (const guild of client.guilds.cache.values()) {
      await ensureGuildConfig(guild.id);
    }

    initializeCacheCleanup(client);
    await cleanupEmptyVCs(client);
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
        messageFilterEnabled: false,
        filterLevel: 'normal',
        levelingEnabled: false,
        xpMultiplier: 1.0,
      });

      await moderationData.save();
      console.log(` Created default moderation settings for guild: ${guildId}`);
    }
  } catch (error) {
    console.error(
      `❌ Error ensuring moderation settings for ${guildId}:`,
      error,
    );
  }
}
