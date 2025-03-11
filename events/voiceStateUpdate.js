const VoiceChannelCreate = require('../models/VoiceChannelCreate');
const VoiceChannelUser = require('../models/VoiceChannelUser');
const { ChannelType } = require('discord.js');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    if(!oldState.channel && newState.channel){
      const serverData = await VoiceChannelCreate.findOne({ guildId: newState.guild.id})
      if(!serverData || newState.channel.id !== serverData.channel) return;

      const channel = await newState.guild.channels.create({
        name: serverData.name,
        type: ChannelType.GuildVoice,
        parent: serverData.categoryId,
        userLimit: serverData.limit || 0
      })

      await VoiceChannelUser.create({
          guildId: newState.guild.id,
          userId: newState.member.id,
          channelId: channel.id
      });

      await newState.member.voice.setChannel(channel).catch(err =>{});
    }

    if(oldState.channel && !newState.channel){
      const userData = await VoiceChannelUser.findOne({channelId: oldState.channel.id});
      if(!userData) return;

      const channel = await oldState.guild.channel.resolve(oldState.channel.id)
      if(channel && channel.member.size === 0){
        await VoiceChannelUser.deleteOne({channelId: oldState.channel.id})
        await channel.delete().catch(err => {});
      }
    }
  },
};
