const { Events } = require('discord.js');
const Moderation = require('../models/Moderation');

module.exports = {
  name: Events.GuildCreate,
  async execute(guild) {
    console.log(` Joined a new guild: ${guild.name} (${guild.id})`);
    await ensureGuildConfig(guild.id);
  },
};

async function ensureGuildConfig(guildId) {
  try {
    if (!guildId) {
      throw new Error('guildId is undefined');
    }

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
      console.log(
        ` Created default moderation settings for new guild: ${guildId}`,
      );
    }
  } catch (error) {
    console.error(` Error ensuring moderation settings for ${guildId}:`, error);
  }
}
