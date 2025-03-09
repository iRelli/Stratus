const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Moderation = require('../../models/Moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('filter')
    .setDescription('Manage the message filter settings.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('toggle')
        .setDescription('Enable or disable the message filter.')
        .addBooleanOption((option) =>
          option
            .setName('enabled')
            .setDescription('Enable or disable filtering.')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('level')
        .setDescription('Set the message filter sensitivity level.')
        .addStringOption((option) =>
          option
            .setName('level')
            .setDescription('Choose a sensitivity level.')
            .setRequired(true)
            .addChoices(
              { name: 'Normal', value: 'normal' },
              { name: 'Harsh', value: 'harsh' },
              { name: 'Extreme', value: 'extreme' },
            ),
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    let moderationData = await Moderation.findOne({ guildId });

    if (!moderationData) {
      moderationData = await Moderation.create({ guildId });
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'toggle') {
      const enabled = interaction.options.getBoolean('enabled');
      moderationData.messageFilterEnabled = enabled;
      await moderationData.save();
      return interaction.reply({
        content: `✅ Message filtering has been **${enabled ? 'enabled' : 'disabled'}**.`,
        flags: 64,
      });
    }

    if (subcommand === 'level') {
      const level = interaction.options.getString('level');
      moderationData.filterLevel = level;
      await moderationData.save();
      return interaction.reply({
        content: `✅ Message filter level set to **${level.toUpperCase()}**.`,
        flags: 64,
      });
    }
  },
};
