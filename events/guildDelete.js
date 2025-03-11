const VoiceChannelUser = require('../models/VoiceChannelUser');
const VoiceChannelCreate = require('../models/VoiceChannelCreate');
const Moderation = require('../models/Moderation');
const AFK = require('../models/AFK');

module.exports = {
  name: 'guildDelete',
  async execute(guild) {
    const guildId = guild.id;

    try {
      await VoiceChannelUser.deleteMany({ guildId });

      await VoiceChannelCreate.deleteMany({ guildId });

      await Moderation.deleteMany({ guildId });


      console.log(`Deleted all database entries for guild: ${guildId}`);
    } catch (error) {
      console.error(`Error deleting database entries for guild: ${guildId}`, error);
    }
  },
};