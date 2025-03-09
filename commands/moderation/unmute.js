const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require('discord.js');
const Moderation = require('../../models/Moderation');
const errorHandler = require('../../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription("Removes a user's mute.")
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to unmute.')
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    try {
      const user = interaction.options.getUser('user');
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

      const member = await guild.members.fetch(user.id);
      if (!member.isCommunicationDisabled()) {
        return interaction.reply({
          content: '❌ This user is not muted.',
          flags: 64,
        });
      }

      if (!moderationData.logChannelId) {
        return interaction.reply({
          content: '⚠️ Please run `/setup create` first to set up logging.',
          flags: 64,
        });
      }

      await member.timeout(null);
      interaction.reply({
        content: `✅ **${user.tag}** has been unmuted.`,
        flags: 64,
      });

      const logChannel = guild.channels.cache.get(moderationData.logChannelId);
      if (logChannel) {
        const unmuteEmbed = new EmbedBuilder()
          .setColor('#808080')
          .setTitle('User Unmuted')
          .addFields(
            {
              name: 'User',
              value: `<@${user.id}> (${user.tag})`,
              inline: true,
            },
            { name: 'Moderator', value: `<@${moderator.id}>`, inline: true },
            {
              name: 'Timestamp',
              value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
              inline: true,
            },
          )
          .setTimestamp();

        logChannel.send({ embeds: [unmuteEmbed] });
      }

      moderationData.logs.push({
        action: 'unmute',
        userId: user.id,
        moderator: moderator.id,
        timestamp: new Date(),
      });

      await moderationData.save();
      interaction.client.cache.servers.set(guild.id, moderationData);
    } catch (error) {
      return errorHandler(interaction, error);
    }
  },
};
