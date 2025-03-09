const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const Moderation = require('../../models/Moderation');
const errorHandler = require('../../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Manages user warnings.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Warn a user.')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('The user to warn.')
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('reason')
            .setDescription('Reason for the warning.')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('view')
        .setDescription('View warnings for a user.')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('The user to check.')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Remove warnings from a user.')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('The user to modify.')
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName('amount')
            .setDescription('Number of warnings to remove.')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('reset').setDescription('Reset all warnings.'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('adjust-limit')
        .setDescription('Adjust the warning limit before auto-ban.')
        .addIntegerOption((option) =>
          option
            .setName('number')
            .setDescription('New warning limit.')
            .setRequired(true),
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    try {
      const guildId = interaction.guild.id;
      const subcommand = interaction.options.getSubcommand();

      let moderationData = interaction.client.cache.servers.get(guildId);

      if (!moderationData) {
        moderationData =
          (await Moderation.findOne({ guildId })) ||
          new Moderation({ guildId });
        interaction.client.cache.servers.set(guildId, moderationData);
      }

      if (!moderationData.logChannelId) {
        return interaction.reply({
          content: '⚠️ Please run `/setup create` first to set up logging.',
          flags: 64,
        });
      }

      const logChannel = interaction.guild.channels.cache.get(
        moderationData.logChannelId,
      );

      if (subcommand === 'add') {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');

        moderationData.warnings.set(
          user.id,
          (moderationData.warnings.get(user.id) || 0) + 1,
        );
        await moderationData.save();
        interaction.client.cache.servers.set(guildId, moderationData);

        const totalWarnings = moderationData.warnings.get(user.id);
        await interaction.reply(
          `⚠️ **${user.tag}** has been warned. Reason: ${reason} (Total: ${totalWarnings})`,
        );

        if (logChannel) {
          const embed = new EmbedBuilder()
            .setColor('#808080')
            .setTitle('User Warned')
            .addFields(
              {
                name: 'User',
                value: `<@${user.id}> (${user.tag})`,
                inline: true,
              },
              {
                name: 'Moderator',
                value: `<@${interaction.user.id}>`,
                inline: true,
              },
              { name: 'Reason', value: reason, inline: false },
              {
                name: 'Total Warnings',
                value: `${totalWarnings}/${moderationData.warningLimit}`,
                inline: true,
              },
            )
            .setTimestamp();
          logChannel.send({ embeds: [embed] });
        }

        if (totalWarnings >= moderationData.warningLimit) {
          await interaction.guild.members.ban(user.id, {
            reason: 'Exceeded warning limit',
          });
          moderationData.bans.push(user.id);
          await moderationData.save();
          interaction.client.cache.servers.set(guildId, moderationData);

          if (logChannel) {
            const banEmbed = new EmbedBuilder()
              .setColor('#808080')
              .setTitle('User Auto-Banned')
              .addFields(
                {
                  name: 'User',
                  value: `<@${user.id}> (${user.tag})`,
                  inline: true,
                },
                {
                  name: 'Reason',
                  value: 'Exceeded warning limit',
                  inline: false,
                },
              )
              .setTimestamp();
            logChannel.send({ embeds: [banEmbed] });
          }
        }
      } else if (subcommand === 'view') {
        const user = interaction.options.getUser('user');
        const warnings = moderationData.warnings.get(user.id) || 0;
        await interaction.reply(
          `⚠️ **${user.tag}** has **${warnings}** warnings.`,
        );
      } else if (subcommand === 'remove') {
        const user = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        const currentWarnings = moderationData.warnings.get(user.id) || 0;
        moderationData.warnings.set(
          user.id,
          Math.max(0, currentWarnings - amount),
        );
        await moderationData.save();
        interaction.client.cache.servers.set(guildId, moderationData);
        await interaction.reply(
          `✅ **${amount}** warnings removed from **${user.tag}**. (Total: ${moderationData.warnings.get(user.id)})`,
        );
      } else if (subcommand === 'reset') {
        if (!moderationData.moderators.has(interaction.user.id)) {
          return interaction.reply({
            content: '🚫 You do not have permission to use this command.',
            flags: 64,
          });
        }
        moderationData.warnings = new Map();
        await moderationData.save();
        interaction.client.cache.servers.set(guildId, moderationData);
        await interaction.reply('✅ All warnings have been **reset**.');
      } else if (subcommand === 'adjust-limit') {
        const newLimit = interaction.options.getInteger('number');
        moderationData.warningLimit = newLimit;
        await moderationData.save();
        interaction.client.cache.servers.set(guildId, moderationData);
        await interaction.reply(
          `✅ The warning limit has been adjusted to **${newLimit}**.`,
        );
      }
    } catch (error) {
      return errorHandler(interaction, error);
    }
  },
};
