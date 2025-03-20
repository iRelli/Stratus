const VoiceChannelCreate = require('../models/VoiceChannelCreate');
const {
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  GatewayDispatchEvents,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    if (!newState.channel && !oldState.channel) return;

    const guild = newState.guild || oldState.guild;

    const j2cData = await VoiceChannelCreate.findOne({
      guildId: guild.id,
      generator: true,
    });

    if (!j2cData || !j2cData.categoryId) return;

    if (newState.channelId === j2cData.channelId) {
      try {
        const newChannel = await newState.guild.channels.create({
          name: `${newState.member.displayName}'s VC`,
          type: ChannelType.GuildVoice,
          parent: j2cData.categoryId,
          permissionOverwrites: [
            {
              id: newState.member.id,
              allow: [
                PermissionsBitField.Flags.ManageChannels,
                PermissionsBitField.Flags.MuteMembers,
                PermissionsBitField.Flags.DeafenMembers,
                PermissionsBitField.Flags.Connect,
                PermissionsBitField.Flags.Speak,
                PermissionsBitField.Flags.Stream,
              ],
            },
          ],
        });

        await VoiceChannelCreate.create({
          guildId: newState.guild.id,
          channelId: newChannel.id,
          ownerId: newState.member.id,
          categoryId: j2cData.categoryId,
          generator: false,
        });

        console.log(` Created temporary VC for ${newState.member.displayName}`);

        const embed = new EmbedBuilder()
          .setTitle('🎙️ Join VC Management')
          .setDescription(
            'Manage your voice channel using these buttons or `/vc` commands!',
          )
          .setColor('#808080')
          .setThumbnail(
            newState.member.user.displayAvatarURL({ dynamic: true }),
          );

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('lock')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('unlock')
            .setEmoji('🔓')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('hide')
            .setEmoji('🙈')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('unhide')
            .setEmoji('👁️')
            .setStyle(ButtonStyle.Secondary),
        );

        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('limit')
            .setEmoji('👥')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('invite')
            .setEmoji('➕')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('ban')
            .setEmoji('⛔')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('permit')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Secondary),
        );

        const row3 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('rename')
            .setEmoji('✏️')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('claim')
            .setEmoji('👑')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('transfer')
            .setEmoji('🔁')
            .setStyle(ButtonStyle.Secondary),
        );

        await newChannel.send({
          content: `🎙️ <@${newState.member.id}> your voice channel **${newChannel.name}** has been created!`,
          embeds: [embed],
          components: [row1, row2, row3],
        });

        setTimeout(async () => {
          if (!newState.member.voice.channel) return;
          try {
            await newState.member.voice.setChannel(newChannel);
          } catch (moveError) {
            console.error(' Error moving user:', moveError);
          }
        }, 1000);
      } catch (err) {
        console.error(' Error creating voice channel:', err);
      }
    }

    if (oldState.channelId && !newState.channelId) {
      try {
        const vcData = await VoiceChannelCreate.findOne({
          guildId: oldState.guild.id,
          channelId: oldState.channelId,
        });

        if (!vcData) return;

        if (vcData.generator) return;

        const oldChannel = await oldState.guild.channels
          .fetch(oldState.channelId)
          .catch(() => null);

        if (!oldChannel) {
          console.log(
            `🗑️ Channel ${oldState.channelId} not found, removing from database.`,
          );
          await VoiceChannelCreate.deleteOne({ channelId: oldState.channelId });
          return;
        }

        if (oldChannel.members.size === 0) {
          console.log(`🗑️ Deleting empty VC: ${oldChannel.name}`);
          await oldChannel.delete();
          await VoiceChannelCreate.deleteOne({ channelId: oldState.channelId });
        }
      } catch (error) {
        console.error(` Error deleting empty voice channel:`, error);
      }
    }
  },
};
