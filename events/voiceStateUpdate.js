const VoiceMaster = require('../models/VoiceMaster');
const AFK = require('../models/afkSchema');
const { ChannelType } = require('discord.js');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    if (!oldState.channel && newState.channel) {
      // User joins a voice channel
      const { channel } = newState;
      const guildId = newState.guild.id;

      const voiceMasterData = await VoiceMaster.findOne({ guildId });
      if (!voiceMasterData) return;

      // Check if the joined channel is the setup channel
      if (channel.id === voiceMasterData.channelId) {
        try {
          // Wait for a short period to ensure the user is fully connected
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Verify the user is still connected to the "Join to Create" channel
          const member = await channel.guild.members.fetch(newState.id);
          if (member.voice.channelId !== channel.id) {
            console.log('User is no longer connected to the "Join to Create" channel.');
            return;
          }

          // Create a new temporary voice channel
          const newVoiceChannel = await channel.guild.channels.create({
            name: `Temp ${newState.member.displayName}`,
            type: ChannelType.GuildVoice,
            parent: voiceMasterData.categoryId,
          });

          // Move the user to the new temporary voice channel
          await newState.member.voice.setChannel(newVoiceChannel);

          // Update users in VoiceMaster data
          voiceMasterData.users.push(newState.member.id);
          await voiceMasterData.save();

        } catch (error) {
          console.error(
            '❌ Error creating new temporary voice channel:',
            error,
          );
        }
      }

      // Remove AFK status if the user joins a voice channel
      try {
        const afkStatus = await AFK.findOne({ userId: newState.member.id });
        if (afkStatus) {
          await AFK.findOneAndDelete({ userId: newState.member.id });
          newState.member.send(
            'Welcome back! Your AFK status has been removed because you joined a voice channel.',
          );
        }
      } catch (error) {
        console.error('Error removing AFK status on voiceStateUpdate:', error);
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

      // Immediate deletion if no one is in the channel
      if (channel.parentId === voiceMasterData.categoryId && channel.members.size === 0) {
        try {
          await channel.delete();
        } catch (error) {
          console.error('❌ Error deleting empty temporary voice channel:', error);
        }
      }

      // Reassign ownership if the owner leaves
      if (channel.id === voiceMasterData.channelId && oldState.member.id === voiceMasterData.ownerId) {
        setTimeout(async () => {
          if (channel.members.size > 0) {
            const newOwner = channel.members.first();
            voiceMasterData.ownerId = newOwner.id;
            await voiceMasterData.save();
            newOwner.send('You are now the owner of the temporary voice channel.');
          }
        }, 300000); // 5 minutes in milliseconds
      }
    }
  },
};