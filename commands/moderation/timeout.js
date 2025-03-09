const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require('discord.js');
const Moderation = require('../../models/Moderation');
const errorHandler = require('../../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Times out a user for a specified duration.')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to timeout.')
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName('duration')
        .setDescription('Duration in minutes (Max: 7 days).')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Reason for the timeout.')
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    try {
      const user = interaction.options.getUser('user');
      const duration = interaction.options.getInteger('duration');
      const reason =
        interaction.options.getString('reason') || 'No reason provided';
      const guild = interaction.guild;
      const moderator = interaction.user;

      let moderationData = interaction.client.cache.servers.get(guild.id);

      if (!moderationData) {
        moderationData =
          (await Moderation.findOne({ guildId: guild.id })) ||
          new Moderation({ guildId });
        interaction.client.cache.servers.set(guild.id, moderationData);
      }

      if (!moderationData.moderators.has(moderator.id)) {
        return interaction.reply({
          content: '🚫 You do not have permission to use this command.',
          flags: 64,
        });
      }

      if (duration > 10080) {
        return interaction.reply({
          content:
            '❌ The timeout duration cannot exceed 7 days (10080 minutes).',
          flags: 64,
        });
      }

      const member = await guild.members.fetch(user.id);
      if (!member.moderatable) {
        return interaction.reply({
          content:
            '❌ I cannot timeout this user. They may have a higher role or permissions.',
          flags: 64,
        });
      }

      if (!moderationData.logChannelId) {
        return interaction.reply({
          content: '⚠️ Please run `/setup create` first to set up logging.',
          flags: 64,
        });
      }

      await member.timeout(duration * 60 * 1000, reason);
      interaction.reply({
        content: `✅ **${user.tag}** has been timed out for **${duration} minutes**.`,
        flags: 64,
      });

      const logChannel = guild.channels.cache.get(moderationData.logChannelId);
      if (logChannel) {
        const timeoutEmbed = new EmbedBuilder()
          .setColor('#808080')
          .setTitle('User Timed Out')
          .addFields(
            {
              name: 'User',
              value: `<@${user.id}> (${user.tag})`,
              inline: true,
            },
            { name: 'Moderator', value: `<@${moderator.id}>`, inline: true },
            { name: 'Duration', value: `${duration} minutes`, inline: true },
            { name: 'Reason', value: reason, inline: false },
            {
              name: 'Timestamp',
              value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
              inline: true,
            },
          )
          .setTimestamp();

        logChannel.send({ embeds: [timeoutEmbed] });
      }

      moderationData.logs.push({
        action: 'timeout',
        userId: user.id,
        moderator: moderator.id,
        reason: reason,
        duration: `${duration} minutes`,
        timestamp: new Date(),
      });

      await moderationData.save();
      interaction.client.cache.servers.set(guild.id, moderationData);
    } catch (error) {
      return errorHandler(interaction, error);
    }
  },
};
