const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Moderation = require('../../models/Moderation');
const errorHandler = require('../../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Deletes messages based on specified criteria.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('all')
        .setDescription('Deletes a specified number of messages.')
        .addIntegerOption((option) =>
          option
            .setName('count')
            .setDescription('Number of messages to delete.')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('humans')
        .setDescription('Deletes messages from human users.')
        .addIntegerOption((option) =>
          option
            .setName('count')
            .setDescription('Number of messages to delete.')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('bots')
        .setDescription('Deletes messages from bots.')
        .addIntegerOption((option) =>
          option
            .setName('count')
            .setDescription('Number of messages to delete.')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('images')
        .setDescription('Deletes messages containing images.')
        .addIntegerOption((option) =>
          option
            .setName('count')
            .setDescription('Number of messages to delete.')
            .setRequired(true),
        ),
    ),
  async execute(interaction) {
    try {
      const { channel, options } = interaction;
      const subcommand = options.getSubcommand();
      const count = options.getInteger('count');
      const guildId = interaction.guild.id;

      let moderationData = interaction.client.cache.servers.get(guildId);

      if (!moderationData) {
        moderationData =
          (await Moderation.findOne({ guildId })) ||
          new Moderation({ guildId });
        interaction.client.cache.servers.set(guildId, moderationData);
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
          flags: 64,
        });
      }

      if (count < 1 || count > 100) {
        return interaction.reply({
          content:
            '⚠️ You can only delete between **1 and 100** messages at a time.',
          flags: 64,
        });
      }

      const messages = await channel.messages.fetch({ limit: count });

      let filteredMessages;
      if (subcommand === 'all') {
        filteredMessages = messages;
      } else if (subcommand === 'humans') {
        filteredMessages = messages.filter((msg) => !msg.author.bot);
      } else if (subcommand === 'bots') {
        filteredMessages = messages.filter((msg) => msg.author.bot);
      } else if (subcommand === 'images') {
        filteredMessages = messages.filter((msg) => msg.attachments.size > 0);
      }

      if (filteredMessages.size === 0) {
        return interaction.reply({
          content: `⚠️ No messages found matching the criteria.`,
          flags: 64,
        });
      }

      await channel.bulkDelete(filteredMessages, true).catch((err) => {
        console.error(err);
        return interaction.reply({
          content:
            ' Failed to delete messages. Some may be older than 14 days.',
          flags: 64,
        });
      });

      return interaction.reply({
        content: ` Successfully deleted **${filteredMessages.size}** messages.`,
        flags: 64,
      });
    } catch (error) {
      return errorHandler(interaction, error);
    }
  },
};
