const VoiceChannelCreate = require('../models/VoiceChannelCreate');
const VoiceChannelUser = require('../models/VoiceChannelUser');
const { ChannelType } = require('discord.js');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    const guildId = newState.guild.id;

    // Fetch the guild's configuration for voice channel creation
    const voiceChannelCreateData = await VoiceChannelCreate.findOne({
      guildId,
    });
    if (!voiceChannelCreateData || !voiceChannelCreateData.channelId) return;

    // Handle user joining a voice channel
    if (!oldState.channel && newState.channel) {
      if (newState.channelId === voiceChannelCreateData.channelId) {
        const userId = newState.member.id;

        // Check if the user already has a temporary channel
        const userChannelData = await VoiceChannelUser.findOne({
          guildId,
          userId,
        });
        if (userChannelData) {
          const existingChannel = newState.guild.channels.cache.get(
            userChannelData.channelId,
          );
          if (existingChannel) {
            await newState.setChannel(existingChannel);
            return;
          }
        }

        // Create a new temporary voice channel
        const tempChannelName = voiceChannelCreateData.name.replace(
          '{username}',
          newState.member.user.username,
        );
        const newVoiceChannel = await newState.guild.channels.create({
          name: tempChannelName,
          type: ChannelType.GuildVoice,
          parent: voiceChannelCreateData.categoryId,
          userLimit: voiceChannelCreateData.limit || 0,
          permissionOverwrites: [
            {
              id: newState.guild.id,
              deny: ['ViewChannel'],
            },
            {
              id: newState.member.id,
              allow: ['ViewChannel', 'ManageChannels'],
            },
          ],
        });

        // Move the user to the new temporary voice channel
        await newState.member.voice.setChannel(newVoiceChannel);

        // Store the temporary channel in the database
        const newUserChannelData = new VoiceChannelUser({
          guildId,
          channelId: newVoiceChannel.id,
          userId,
        });
        await newUserChannelData.save();
      }
    }

    // Handle user leaving a voice channel
    if (oldState.channel && !newState.channel) {
      const { channel } = oldState;

      // Fetch the user's temporary channel data
      const userChannelData = await VoiceChannelUser.findOne({
        guildId,
        channelId: channel.id,
        userId: oldState.member.id,
      });
      if (!userChannelData) return;

      // Immediate deletion if no one is in the channel
      if (channel.members.size === 0) {
        try {
          await channel.delete();
          await VoiceChannelUser.deleteOne({ guildId, channelId: channel.id });
        } catch (error) {
          console.error(
            '❌ Error deleting empty temporary voice channel:',
            error,
          );
        }
      }
    }
  },
};
