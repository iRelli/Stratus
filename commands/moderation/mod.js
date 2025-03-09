const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const Moderation = require('../../models/Moderation');
const errorHandler = require('../../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Manage moderators for the bot.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Grants a user moderator permissions.')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('User to add as a moderator.')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Removes a user from moderator permissions.')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('User to remove as a moderator.')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('Lists all users with moderator permissions.'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('view')
        .setDescription('Checks when a user was added as a moderator.')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('User to check.')
            .setRequired(true),
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      const guild = interaction.guild;
      const guildId = guild.id;
      const subcommand = interaction.options.getSubcommand();
      let moderationData = interaction.client.cache.servers.get(guildId);

      if (!moderationData) {
        moderationData =
          (await Moderation.findOne({ guildId })) ||
          new Moderation({ guildId, moderators: new Map() });
        interaction.client.cache.servers.set(guildId, moderationData);
      }

      if (subcommand === 'add') {
        const user = interaction.options.getUser('user');
        const admin = interaction.user;

        if (moderationData.moderators.has(user.id)) {
          return interaction.reply({
            content: `⚠️ **${user.tag}** is already a moderator.`,
            flags: 64,
          });
        }

        moderationData.moderators.set(user.id, {
          addedBy: admin.id,
          timestamp: Date.now(),
        });
        await moderationData.save();
        interaction.client.cache.servers.set(guildId, moderationData);

        const embed = new EmbedBuilder()
          .setColor('#808080')
          .setTitle('Moderator Added')
          .setDescription(
            `**${user.username}** has been granted moderator permissions.`,
          )
          .addFields(
            { name: 'Added By', value: `<@${admin.id}>`, inline: true },
            {
              name: 'Timestamp',
              value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
              inline: true,
            },
          )
          .setTimestamp();

        const logChannel = guild.channels.cache.get(
          moderationData.logChannelId,
        );
        if (logChannel) logChannel.send({ embeds: [embed] });

        return interaction.reply({
          content: `✅ **${user.tag}** has been added as a moderator.`,
          flags: 64,
        });
      }

      if (subcommand === 'remove') {
        const user = interaction.options.getUser('user');
        const admin = interaction.user;

        if (!moderationData.moderators.has(user.id)) {
          return interaction.reply({
            content: `⚠️ **${user.tag}** is not a moderator.`,
            flags: 64,
          });
        }

        moderationData.moderators.delete(user.id);
        await moderationData.save();
        interaction.client.cache.servers.set(guildId, moderationData);

        const embed = new EmbedBuilder()
          .setColor('#808080')
          .setTitle('Moderator Removed')
          .setDescription(
            `**${user.username}** has been removed from moderator permissions.`,
          )
          .addFields(
            { name: 'Removed By', value: `<@${admin.id}>`, inline: true },
            {
              name: 'Timestamp',
              value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
              inline: true,
            },
          )
          .setTimestamp();

        const logChannel = guild.channels.cache.get(
          moderationData.logChannelId,
        );
        if (logChannel) logChannel.send({ embeds: [embed] });

        return interaction.reply({
          content: `✅ **${user.tag}** has been removed as a moderator.`,
          flags: 64,
        });
      }

      if (subcommand === 'list') {
        if (
          !moderationData.moderators ||
          moderationData.moderators.size === 0
        ) {
          return interaction.reply({
            content: '⚠️ No moderators have been assigned.',
            flags: 64,
          });
        }

        const sortedModerators = [...moderationData.moderators.entries()].sort(
          (a, b) => b[1]?.timestamp - a[1]?.timestamp,
        );

        const moderatorNames = await Promise.all(
          sortedModerators.map(async ([id, data]) => {
            try {
              const member = await guild.members.fetch(id);
              const formattedTime = data.timestamp
                ? `<t:${Math.floor(data.timestamp / 1000)}:R>`
                : 'Unknown Time';
              const addedBy = data.addedBy
                ? `<@${data.addedBy}>`
                : 'Unknown User';
              return `**${member.displayName}** (\`${id}\`) - Added by ${addedBy} on ${formattedTime}`;
            } catch {
              return `Unknown User (\`${id}\`) - Added by ${data.addedBy ? `<@${data.addedBy}>` : 'Unknown User'} on ${data.timestamp ? `<t:${Math.floor(data.timestamp / 1000)}:R>` : 'Unknown Time'}`;
            }
          }),
        );

        const embed = new EmbedBuilder()
          .setColor('#808080')
          .setTitle('Moderators List')
          .setDescription(moderatorNames.join('\n') || 'None')
          .setTimestamp();

        return interaction.reply({ embeds: [embed], flags: 64 });
      }

      if (subcommand === 'view') {
        const user = interaction.options.getUser('user');

        if (!moderationData.moderators.has(user.id)) {
          return interaction.reply({
            content: `⚠️ **${user.tag}** is not a moderator.`,
            flags: 64,
          });
        }

        const data = moderationData.moderators.get(user.id);
        const formattedTime = `<t:${Math.floor(data.timestamp / 1000)}:F>`;

        const embed = new EmbedBuilder()
          .setColor('#808080')
          .setTitle('Moderator Info')
          .setDescription(
            `**${user.username}** was added as a moderator on ${formattedTime}.`,
          )
          .addFields({
            name: 'Added By',
            value: `<@${data.addedBy}>`,
            inline: true,
          })
          .setTimestamp();

        return interaction.reply({ embeds: [embed], flags: 64 });
      }
    } catch (error) {
      return errorHandler(interaction, error);
    }
  },
};
