const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require('discord.js');
const Moderation = require('../../models/Moderation');
const errorHandler = require('../../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kicks a user from the server and logs it.')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to kick.')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Reason for the kick.')
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    try {
      const user = interaction.options.getUser('user');
      const reason =
        interaction.options.getString('reason') || 'No reason provided';
      const moderator = interaction.user;
      const guild = interaction.guild;

      let moderationData = interaction.client.cache.servers.get(guild.id);

      if (!moderationData) {
        moderationData =
          (await Moderation.findOne({ guildId: guild.id })) ||
          new Moderation({ guildId });
        interaction.client.cache.servers.set(guild.id, moderationData);
      }

      if (!moderationData.logChannelId) {
        return interaction.reply({
          content:
            '⚠️ Please run `/setup` first to create the moderation log channel.',
          flags: 64,
        });
      }

      if (!moderationData || moderationData.moderators.length === 0) {
        return interaction.reply({
          content: '⚠️ No moderators have been assigned. Use `/mod add` first.',
          ephemeral: true,
        });
      }

      if (!moderationData.moderators.has(interaction.user.id)) {
        return interaction.reply({
          content: '🚫 You do not have permission to use this command.',
          ephemeral: true,
        });
      }

      const member = await guild.members.fetch(user.id);
      await member.kick(reason);
      interaction.reply({
        content: ` **${user.tag}** has been kicked.`,
        flags: 64,
      });

      const logChannel = guild.channels.cache.get(moderationData.logChannelId);
      if (logChannel) {
        const kickEmbed = new EmbedBuilder()
          .setColor('#808080')
          .setTitle('User Kicked')
          .addFields(
            {
              name: 'User',
              value: `<@${user.id}> (${user.tag})`,
              inline: true,
            },
            { name: 'Moderator', value: `<@${moderator.id}>`, inline: true },
            { name: 'Reason', value: reason, inline: false },
            {
              name: 'Timestamp',
              value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
              inline: true,
            },
          )
          .setTimestamp();

        logChannel.send({ embeds: [kickEmbed] });
      }

      moderationData.logs.push({
        action: 'kick',
        userId: user.id,
        moderator: moderator.id,
        reason: reason,
        timestamp: new Date(),
      });

      await moderationData.save();
      interaction.client.cache.servers.set(guild.id, moderationData);
    } catch (error) {
      return errorHandler(interaction, error);
    }
  },
};
