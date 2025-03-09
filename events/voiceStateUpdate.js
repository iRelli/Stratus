const VoiceMaster = require('../models/VoiceMaster');
const { ChannelType } = require('discord.js');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    if (!oldState.channel && newState.channel) {
      const { channel } = newState;
      const guildId = newState.guild.id;

      const voiceMasterData = await VoiceMaster.findOne({ guildId });
      if (!voiceMasterData) return;

      // Check if the joined channel is the setup channel
      if (channel.id === voiceMasterData.channelId) {
        try {
          // Create a new temporary voice channel
          const newVoiceChannel = await channel.guild.channels.create({
            name: `Temp ${newState.member.displayName}`,
            type: ChannelType.GuildVoice,
            parent: voiceMasterData.categoryId,
          });

          // Move the user to the new temporary voice channel
          await newState.member.voice.setChannel(newVoiceChannel);

          // Set a timeout to delete the temporary voice channel after 5 minutes of inactivity
          newVoiceChannel.timeout = setTimeout(async () => {
            if (newVoiceChannel.members.size === 0) {
              await newVoiceChannel.delete();
            }
          }, 300000); // 5 minutes in milliseconds
        } catch (error) {
          console.error(
            '❌ Error creating new temporary voice channel:',
            error,
          );
        }
      }
    }

    // Check if a user left a voice channel
    if (oldState.channel && !newState.channel) {
      const { channel } = oldState;

      // Get VoiceMaster configuration from the database
      const voiceMasterData = await VoiceMaster.findOne({
        guildId: oldState.guild.id,
      });
      if (!voiceMasterData) return;

      // Check if the channel is a temporary voice channel and is now empty
      if (
        channel.parentId === voiceMasterData.categoryId &&
        channel.members.size === 0
      ) {
        // Clear the timeout to delete the channel if it was set
        if (channel.timeout) {
          clearTimeout(channel.timeout);
          channel.timeout = null;
        }

        // Set a timeout to delete the temporary voice channel after 5 minutes of inactivity
        channel.timeout = setTimeout(async () => {
          if (channel.members.size === 0) {
            await channel.delete();
          }
        }, 300000); // 5 minutes in milliseconds
      }
    }
  },
};
