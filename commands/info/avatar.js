const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription("Displays a user's avatar.")
    .addUserOption((option) =>
      option.setName('user').setDescription('Select a user').setRequired(false),
    ),

  async execute(interaction) {
    try {
      const user = interaction.options.getUser('user') || interaction.user;
      const avatarURL = user.displayAvatarURL({ dynamic: true, size: 1024 });

      const embed = new EmbedBuilder()
        .setColor('Grey')
        .setTitle(`🖼️ Avatar - ${user.tag}`)
        .setImage(avatarURL)
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        });

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching avatar:', error);
      return interaction.reply({
        content: '❌ An error occurred while fetching the avatar.',
        flags: 64,
      });
    }
  },
};
