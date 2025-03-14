const {
  PermissionsBitField,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const VoiceChannelCreate = require('../models/VoiceChannelCreate');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (
      !interaction.isButton() &&
      !interaction.isStringSelectMenu() &&
      !interaction.isModalSubmit()
    ) {
      return;
    }

    const { customId, user, guild } = interaction;
    const member = interaction.member;
    const userVoiceChannel = member.voice.channel;

    if (!userVoiceChannel) {
      return interaction.reply({
        content: '❌ You are not in any voice channel.',
        ephemeral: true,
      });
    }

    const vcData = await VoiceChannelCreate.findOne({
      guildId: guild.id,
      channelId: userVoiceChannel.id,
    });

    if (!vcData) {
      return interaction.reply({
        content: '❌ This voice channel is not registered.',
        ephemeral: true,
      });
    }

    if (
      interaction.message &&
      interaction.message.channel.id !== userVoiceChannel.id
    ) {
      return interaction.reply({
        content:
          '❌ You can only manage the voice channel you are currently in.',
        ephemeral: true,
      });
    }

    if (vcData.ownerId !== user.id && customId !== 'claim') {
      return interaction.reply({
        content: '❌ Only the owner can manage this voice channel.',
        ephemeral: true,
      });
    }

    switch (customId) {
      case 'lock':
        if (
          !userVoiceChannel
            .permissionsFor(guild.roles.everyone)
            .has(PermissionsBitField.Flags.Connect)
        ) {
          return interaction.reply({
            content: '🔒 Your voice channel is already locked.',
            ephemeral: true,
          });
        }
        await userVoiceChannel.permissionOverwrites.edit(guild.roles.everyone, {
          Connect: false,
        });
        return interaction.reply({
          content: '🔒 Your voice channel is now locked.',
          ephemeral: true,
        });
        break;

      case 'unlock':
        if (
          userVoiceChannel
            .permissionsFor(guild.roles.everyone)
            .has(PermissionsBitField.Flags.Connect)
        ) {
          return interaction.reply({
            content: '🔓 Your voice channel is already unlocked.',
            ephemeral: true,
          });
        }
        await userVoiceChannel.permissionOverwrites.edit(guild.roles.everyone, {
          Connect: true,
        });
        return interaction.reply({
          content: '🔓 Your voice channel is now unlocked.',
          ephemeral: true,
        });
        break;

      case 'hide':
        if (
          !userVoiceChannel
            .permissionsFor(guild.roles.everyone)
            .has(PermissionsBitField.Flags.ViewChannel)
        ) {
          return interaction.reply({
            content: '🙈 Your voice channel is already hidden.',
            ephemeral: true,
          });
        }
        await userVoiceChannel.permissionOverwrites.edit(guild.roles.everyone, {
          ViewChannel: false,
        });
        return interaction.reply({
          content: '🙈 Your voice channel is now hidden.',
          ephemeral: true,
        });
        break;

      case 'unhide':
        if (
          userVoiceChannel
            .permissionsFor(guild.roles.everyone)
            .has(PermissionsBitField.Flags.ViewChannel)
        ) {
          return interaction.reply({
            content: '👁️ Your voice channel is already visible.',
            ephemeral: true,
          });
        }
        await userVoiceChannel.permissionOverwrites.edit(guild.roles.everyone, {
          ViewChannel: true,
        });
        return interaction.reply({
          content: '👁️ Your voice channel is now visible.',
          ephemeral: true,
        });
        break;

      case 'rename': {
        const modal = new ModalBuilder()
          .setCustomId('renameModal')
          .setTitle('Rename Your Voice Channel');

        const renameInput = new TextInputBuilder()
          .setCustomId('renameInput')
          .setLabel('Enter a new channel name:')
          .setPlaceholder('Example: "Chill Zone"')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const actionRow = new ActionRowBuilder().addComponents(renameInput);
        modal.addComponents(actionRow);

        return interaction.showModal(modal);
      }

      case 'limit': {
        const limitModal = new ModalBuilder()
          .setCustomId('limitModal')
          .setTitle('Set Voice Channel Limit');

        const limitInput = new TextInputBuilder()
          .setCustomId('limitInput')
          .setLabel('Enter the max number of users:')
          .setPlaceholder('0 for unlimited (Max: 99)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const limitRow = new ActionRowBuilder().addComponents(limitInput);
        limitModal.addComponents(limitRow);

        return interaction.showModal(limitModal);
      }

      default:
        return interaction.reply({
          content: '❌ Unknown button action.',
          ephemeral: true,
        });
    }

    // 🔥 Handle Rename Input from Modal
    if (interaction.isModalSubmit() && interaction.customId === 'renameModal') {
      const newName = interaction.fields
        .getTextInputValue('renameInput')
        .trim();

      if (!newName || newName.length > 100) {
        return interaction.reply({
          content:
            '❌ Invalid channel name! Please enter a name between 1-100 characters.',
          ephemeral: true,
        });
      }

      try {
        await userVoiceChannel.setName(newName);
        return interaction.reply({
          content: `✅ Your voice channel has been renamed to **${newName}**.`,
          ephemeral: true,
        });
      } catch (error) {
        console.error('❌ Error renaming voice channel:', error);
        return interaction.reply({
          content: '❌ An error occurred while renaming the voice channel.',
          ephemeral: true,
        });
      }
    }

    // 🔥 Handle Limit Input from Modal
    if (interaction.isModalSubmit() && interaction.customId === 'limitModal') {
      const limitValue = interaction.fields.getTextInputValue('limitInput');
      const limitNumber = parseInt(limitValue, 10);

      if (isNaN(limitNumber) || limitNumber < 0 || limitNumber > 99) {
        return interaction.reply({
          content: '❌ Please enter a valid number between 0 and 99.',
          ephemeral: true,
        });
      }

      await userVoiceChannel.setUserLimit(limitNumber);

      return interaction.reply({
        content: `✅ Voice channel limit set to **${limitNumber === 0 ? 'Unlimited' : limitNumber}** users.`,
        ephemeral: true,
      });
    }
  },
};
