const { SlashCommandBuilder } = require('discord.js');
const AFK = require('../../models/afkSchema');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Set your AFK status.')
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Reason for being AFK')
        .setRequired(true),
    ),
  async execute(interaction) {
    const userId = interaction.user.id;
    const reason = interaction.options.getString('reason');

    try {
      await AFK.findOneAndUpdate(
        { userId },
        { reason, timestamp: Date.now() },
        { upsert: true },
      );
      await interaction.reply({
        content: `You are now AFK: ${reason}`,
        ephemeral: true,
      });
    } catch (error) {
      console.error('Error setting AFK status:', error);
      await interaction.reply({
        content:
          'An error occurred while setting your AFK status. Please try again later.',
        ephemeral: true,
      });
    }
  },
};
