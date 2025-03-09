const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Moderation = require('../../models/Moderation');
const errorHandler = require('../../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ratelimit')
    .setDescription('Manage rate-limiting (slowmode) settings.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('toggle')
        .setDescription('Enable or disable rate-limiting.')
        .addBooleanOption((option) =>
          option
            .setName('enabled')
            .setDescription('Enable or disable rate-limiting.')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('settings')
        .setDescription('Configure rate-limiting settings.')
        .addIntegerOption((option) =>
          option
            .setName('threshold')
            .setDescription('Messages per timeframe before slowmode triggers.')
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName('timeframe')
            .setDescription('Timeframe in seconds.')
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName('duration')
            .setDescription('Slowmode duration in seconds.')
            .setRequired(true),
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

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

      if (subcommand === 'toggle') {
        const enabled = interaction.options.getBoolean('enabled');
        moderationData.rateLimitEnabled = enabled;
        await moderationData.save();
        interaction.client.cache.servers.set(guildId, moderationData);

        return interaction.reply(
          `✅ **Rate-limiting has been ${enabled ? 'enabled' : 'disabled'}.**`,
        );
      }

      if (subcommand === 'settings') {
        const threshold = interaction.options.getInteger('threshold');
        const timeframe = interaction.options.getInteger('timeframe');
        const duration = interaction.options.getInteger('duration');

        moderationData.rateLimitThreshold = threshold;
        moderationData.rateLimitTimeframe = timeframe;
        moderationData.rateLimitDuration = duration;
        await moderationData.save();
        interaction.client.cache.servers.set(guildId, moderationData);

        return interaction.reply(
          `✅ **Rate-limiting settings updated:**\nThreshold: ${threshold} messages\nTimeframe: ${timeframe} seconds\nSlowmode: ${duration} seconds`,
        );
      }
    } catch (error) {
      return errorHandler(interaction, error);
    }
  },
};
