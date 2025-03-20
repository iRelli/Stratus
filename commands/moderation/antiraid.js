const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require('discord.js');
const Moderation = require('../../models/Moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiraid')
    .setDescription('Manage anti-raid protection settings.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('toggle')
        .setDescription('Enable or disable anti-raid protection.')
        .addBooleanOption((option) =>
          option
            .setName('enabled')
            .setDescription('Enable or disable anti-raid.')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('settings')
        .setDescription('Configure anti-raid settings.')
        .addIntegerOption((option) =>
          option
            .setName('threshold')
            .setDescription('Number of joins before triggering.')
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName('timeframe')
            .setDescription('Timeframe in seconds.')
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('action')
            .setDescription('Action to take (kick or ban).')
            .addChoices(
              { name: 'Kick', value: 'kick' },
              { name: 'Ban', value: 'ban' },
            )
            .setRequired(true),
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      const guildId = interaction.guild.id;
      let moderationData = await Moderation.findOne({ guildId });

      if (!moderationData) {
        moderationData = new Moderation({ guildId }); // Ensure a valid document
      }

      const subcommand = interaction.options.getSubcommand();
      const logChannel = interaction.guild.channels.cache.get(
        moderationData.logChannelId,
      );

      if (subcommand === 'toggle') {
        const enabled = interaction.options.getBoolean('enabled');
        moderationData.antiRaidEnabled = enabled;
        await moderationData.save();

        if (logChannel) {
          const embed = new EmbedBuilder()
            .setColor(enabled ? 'Green' : 'Red')
            .setTitle(enabled ? ' Anti-Raid Enabled' : ' Anti-Raid Disabled')
            .addFields(
              {
                name: 'Changed By',
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

        return interaction.reply(
          ` **Anti-raid protection has been ${enabled ? 'enabled' : 'disabled'}.**`,
        );
      }

      if (subcommand === 'settings') {
        const threshold = interaction.options.getInteger('threshold');
        const timeframe = interaction.options.getInteger('timeframe');
        const action = interaction.options.getString('action');

        moderationData.antiRaidThreshold = threshold;
        moderationData.antiRaidTimeframe = timeframe;
        moderationData.antiRaidAction = action;
        await moderationData.save();

        if (logChannel) {
          const embed = new EmbedBuilder()
            .setColor('Grey')
            .setTitle('⚙️ Anti-Raid Settings Updated')
            .addFields(
              {
                name: 'Changed By',
                value: `<@${interaction.user.id}>`,
                inline: true,
              },
              { name: 'Threshold', value: `${threshold} joins`, inline: true },
              {
                name: 'Timeframe',
                value: `${timeframe} seconds`,
                inline: true,
              },
              { name: 'Action', value: action.toUpperCase(), inline: true },
              {
                name: 'Timestamp',
                value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
              },
            )
            .setTimestamp();

          logChannel.send({ embeds: [embed] });
        }

        return interaction.reply(
          ` **Anti-raid settings updated:**\nThreshold: ${threshold} joins\nTimeframe: ${timeframe} seconds\nAction: ${action.toUpperCase()}`,
        );
      }
    } catch (error) {
      console.error('Error updating anti-raid settings:', error);
      return interaction.reply({
        content: ' An error occurred while updating anti-raid settings.',
        flags: 64,
      });
    }
  },
};
