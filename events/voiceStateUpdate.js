const VoiceChannelCreate = require('../models/VoiceChannelCreate');
const { ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    if (!newState.channel && !oldState.channel) return;

    const j2cData = await VoiceChannelCreate.findOne({ guildId: newState.guild.id });
    if (!j2cData || !j2cData.categoryId) return;

    // ✅ Creating a new VC when a user joins the J2C channel
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
                PermissionsBitField.Flags.MoveMembers,
                PermissionsBitField.Flags.Connect,
                PermissionsBitField.Flags.Speak,
                PermissionsBitField.Flags.Stream,
              ],
            },
          ],
        });

        await VoiceChannelCreate.findOneAndUpdate(
          { guildId: newState.guild.id, channelId: newChannel.id },
          {
            guildId: newState.guild.id,
            channelId: newChannel.id,
            ownerId: newState.member.id,
            categoryId: j2cData.categoryId,
            channelName: newChannel.name,
          },
          { upsert: true }
        );

        const embed = new EmbedBuilder()
          .setTitle("Join VC Management")
          .setDescription("Manage your voice channel using these buttons or `/vc` commands!")
          .setColor("#808080")
          .setThumbnail(newState.member.user.displayAvatarURL({ dynamic: true }));

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("lock").setEmoji("🔒").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("unlock").setEmoji("🔓").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("hide").setEmoji("🙈").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("unhide").setEmoji("👁️").setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("limit").setEmoji("👥").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("invite").setEmoji("➕").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("ban").setEmoji("⛔").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("permit").setEmoji("✅").setStyle(ButtonStyle.Secondary)
        );

        const row4 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("claim").setEmoji("👑").setStyle(ButtonStyle.Secondary)
        );

        if (newChannel.permissionsFor(newState.guild.roles.everyone).has(PermissionsBitField.Flags.SendMessages)) {
          await newChannel.send({
            content: `🎙️ <@${newState.member.id}> your voice channel **${newChannel.name}** has been created!`,
            embeds: [embed],
            components: [row1, row2, row4],
          });
        }

        setTimeout(async () => {
          if (!newState.member.voice.channel) return;
          try {
            await newState.member.voice.setChannel(newChannel);
          } catch (moveError) {
            console.error("Error moving user:", moveError);
          }
        }, 1000);
      } catch (err) {
        console.error('Error creating voice channel:', err);
      }
    }

    if (oldState.channel && oldState.channel.id !== j2cData.channelId) {
      const vcData = await VoiceChannelCreate.findOne({ guildId: oldState.guild.id, channelId: oldState.channel.id });

      if (vcData && oldState.channel.members.size === 0) {
        try {
          console.log(`🗑️ Deleting empty VC: ${oldState.channel.name}`);
          await VoiceChannelCreate.deleteOne({ channelId: oldState.channel.id });
          await oldState.channel.delete();
        } catch (error) {
          console.error(`❌ Error deleting empty VC:`, error);
        }
      }
    }
  },
};
