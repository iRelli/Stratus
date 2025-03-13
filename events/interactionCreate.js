const { PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const VoiceChannelCreate = require('../models/VoiceChannelCreate');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    const { customId, user, guild, message } = interaction;
    const member = interaction.member;
    const userVoiceChannel = member.voice.channel;

    if (!userVoiceChannel) {
      return interaction.reply({ content: '❌ You are not in any voice channel.', ephemeral: true });
    }

    const vcData = await VoiceChannelCreate.findOne({ guildId: guild.id, channelId: userVoiceChannel.id });

    if (!vcData) {
      return interaction.reply({ content: '❌ This voice channel is not registered.', ephemeral: true });
    }

    // ✅ Prevents users from interacting with another VC's embed message
    if (message.channelId !== userVoiceChannel.id) {
      return interaction.reply({ content: '❌ You can only use this interface in your own voice channel.', ephemeral: true });
    }

    if (vcData.channelId !== userVoiceChannel.id && customId !== 'claim') {
      return interaction.reply({ content: '❌ You cannot manage a voice channel you are not in.', ephemeral: true });
    }

    if (vcData.ownerId !== user.id && customId !== 'claim') {
      return interaction.reply({ content: '❌ Only the owner can manage this voice channel.', ephemeral: true });
    }

    if (customId === 'limit') {
      const modal = new ModalBuilder()
        .setCustomId('limitModal')
        .setTitle('Set Voice Channel Limit');

      const limitInput = new TextInputBuilder()
        .setCustomId('limitInput')
        .setLabel('Enter the max number of users:')
        .setPlaceholder('0 for unlimited')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const actionRow = new ActionRowBuilder().addComponents(limitInput);
      modal.addComponents(actionRow);

      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'limitModal') {
      const limitValue = interaction.fields.getTextInputValue('limitInput');
      const limitNumber = parseInt(limitValue, 10);

      if (isNaN(limitNumber) || limitNumber < 0 || limitNumber > 99) {
        return interaction.reply({ content: '❌ Please enter a valid number between 0 and 99.', ephemeral: true });
      }

      await userVoiceChannel.setUserLimit(limitNumber);

      return interaction.reply({
        content: `✅ Voice channel limit set to **${limitNumber === 0 ? 'Unlimited' : limitNumber}** users.`,
        ephemeral: true,
      });
    }

    switch (customId) {
      case 'lock':
        await userVoiceChannel.permissionOverwrites.edit(guild.roles.everyone, { Connect: false });
        await interaction.reply({ content: '🔒 Your voice channel is now locked.', ephemeral: true });
        break;

      case 'unlock':
        await userVoiceChannel.permissionOverwrites.edit(guild.roles.everyone, { Connect: true });
        await interaction.reply({ content: '🔓 Your voice channel is now unlocked.', ephemeral: true });
        break;

      case 'hide':
        await userVoiceChannel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
        await interaction.reply({ content: '🙈 Your voice channel is now hidden.', ephemeral: true });
        break;

      case 'unhide':
        await userVoiceChannel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: true });
        await interaction.reply({ content: '👁️ Your voice channel is now visible.', ephemeral: true });
        break;

      case 'invite':
        const invite = await userVoiceChannel.createInvite({ maxAge: 3600, maxUses: 1, unique: true });
        await user.send(`📩 **VC Invite:** Click to join ➡️ ${invite.url}`);
        await interaction.reply({ content: '✅ Invite link sent to your DMs.', ephemeral: true });
        break;

      case 'claim':
        if (vcData.ownerId === user.id) {
          return interaction.reply({ content: '❌ You are already the owner.', ephemeral: true });
        }
        await VoiceChannelCreate.findOneAndUpdate(
          { guildId: guild.id, channelId: userVoiceChannel.id },
          { ownerId: user.id }
        );
        await interaction.reply({ content: `👑 You have claimed ownership of the VC.`, ephemeral: true });
        break;

      default:
        return interaction.reply({ content: '❌ Unknown button action.', ephemeral: true });
    }
  },
};
