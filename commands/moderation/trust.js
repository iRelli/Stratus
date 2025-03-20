const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require('discord.js');
const Moderation = require('../../models/Moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trusted')
    .setDescription('Manage trusted users who bypass the message filter.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Add a user to the trusted list.')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('User to add as a trusted user.')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Remove a user from the trusted list.')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('User to remove from trusted users.')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('list').setDescription('Lists all trusted users.'),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      const guildId = interaction.guild.id;
      let moderationData = await Moderation.findOne({ guildId });

      if (!moderationData) {
        moderationData = await Moderation.create({ guildId });
      }

      const subcommand = interaction.options.getSubcommand();
      const logChannel = interaction.guild.channels.cache.get(
        moderationData.logChannelId,
      );

      if (subcommand === 'add') {
        const user = interaction.options.getUser('user');
        if (moderationData.trustedUsers.has(user.id)) {
          return interaction.reply({
            content: `⚠️ **${user.tag}** is already a trusted user.`,
            flags: 64,
          });
        }

        moderationData.trustedUsers.set(user.id, {
          addedBy: interaction.user.id,
          timestamp: Date.now(),
        });
        await moderationData.save();

        if (logChannel) {
          const embed = new EmbedBuilder()
            .setColor('Green')
            .setTitle(' Trusted User Added')
            .addFields(
              { name: 'User', value: `<@${user.id}>`, inline: true },
              {
                name: 'Added By',
                value: `<@${interaction.user.id}>`,
                inline: true,
              },
              {
                name: 'Timestamp',
                value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
              },
            )
            .setTimestamp();

          logChannel.send({ embeds: [embed] });
        }

        return interaction.reply({
          content: ` **${user.tag}** has been added to the trusted list.`,
          flags: 64,
        });
      }

      if (subcommand === 'remove') {
        const user = interaction.options.getUser('user');
        if (!moderationData.trustedUsers.has(user.id)) {
          return interaction.reply({
            content: `⚠️ **${user.tag}** is not a trusted user.`,
            flags: 64,
          });
        }

        moderationData.trustedUsers.delete(user.id);
        await moderationData.save();

        if (logChannel) {
          const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle(' Trusted User Removed')
            .addFields(
              { name: 'User', value: `<@${user.id}>`, inline: true },
              {
                name: 'Removed By',
                value: `<@${interaction.user.id}>`,
                inline: true,
              },
              {
                name: 'Timestamp',
                value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
              },
            )
            .setTimestamp();

          logChannel.send({ embeds: [embed] });
        }

        return interaction.reply({
          content: ` **${user.tag}** has been removed from the trusted list.`,
          flags: 64,
        });
      }

      if (subcommand === 'list') {
        if (moderationData.trustedUsers.size === 0) {
          return interaction.reply({
            content: '⚠️ No trusted users have been assigned.',
            flags: 64,
          });
        }

        const trustedUsers = [...moderationData.trustedUsers.entries()]
          .sort((a, b) => b[1].timestamp - a[1].timestamp) // Sort by most recent
          .map(([id, data]) => {
            const addedBy = `<@${data.addedBy}>`;
            const formattedTime = `<t:${Math.floor(data.timestamp / 1000)}:R>`;
            return `**<@${id}>** - Added by ${addedBy} on ${formattedTime}`;
          })
          .join('\n');

        const embed = new EmbedBuilder()
          .setColor('Grey')
          .setTitle('🚀 Trusted Users List')
          .setDescription(trustedUsers || 'None')
          .setTimestamp();

        return interaction.reply({ embeds: [embed], flags: 64 });
      }
    } catch (error) {
      console.error('Error handling `/trusted` command:', error);
      return interaction.reply({
        content: ' An error occurred while processing your request.',
        flags: 64,
      });
    }
  },
};
