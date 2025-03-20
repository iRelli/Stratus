const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Moderation = require('../../models/Moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leveltoggle')
    .setDescription('Toggle the leveling system on or off.')
    .addBooleanOption((option) =>
      option
        .setName('enabled')
        .setDescription('Enable or disable leveling.')
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      const guildId = interaction.guild.id;
      let moderationData = await Moderation.findOne({ guildId });

      if (!moderationData) {
        moderationData = await Moderation.create({ guildId });
      }

      const enabled = interaction.options.getBoolean('enabled');
      moderationData.levelingEnabled = enabled;
      await moderationData.save();

      return interaction.reply({
        content: ` Leveling has been **${enabled ? 'enabled' : 'disabled'}**.`,
        flags: 64,
      });
    } catch (error) {
      console.error('Error togglingg leveling system:', error);
      return interaction.reply({
        content: ' An error occurred while updating the leveling system.',
        flags: 64,
      });
    }
  },
};
