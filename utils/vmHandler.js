const VoiceChannelCreate = require('../models/VoiceChannelCreate');

async function cleanupEmptyVCs(client) {
  const allVCs = await VoiceChannelCreate.find({});
  if (allVCs.length === 0) {
    console.log(' No temporary voice channels found in the database.');
    return;
  }

  for (const vcData of allVCs) {
    const guild = client.guilds.cache.get(vcData.guildId);
    if (!guild) {
      console.log(`Guild not found for VC: ${vcData.channelId}. Skipping.`);
      continue;
    }

    try {
      const channel = await guild.channels
        .fetch(vcData.channelId)
        .catch(() => null);

      if (!channel) {
        console.log(
          `Channel ${vcData.channelId} does not exist. Removing from database.`,
        );
        await VoiceChannelCreate.deleteOne({ channelId: vcData.channelId });
        continue;
      }

      const j2cData = await VoiceChannelCreate.findOne({
        guildId: vcData.guildId,
        generator: true,
      });

      if (j2cData && j2cData.channelId === vcData.channelId) continue;

      if (channel.members.size === 0) {
        console.log(`Deleting empty voice channel: ${channel.name}`);
        await channel.delete();
        await VoiceChannelCreate.deleteOne({ channelId: vcData.channelId });
      }
    } catch (error) {
      console.error(
        ` Error checking/deleting voice channel ${vcData.channelId}:`,
        error,
      );
    }
  }
}

module.exports = { cleanupEmptyVCs };
