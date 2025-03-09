const { EmbedBuilder } = require('discord.js');

module.exports = async (interaction, error) => {
  console.error(error);

  const errorEmbed = new EmbedBuilder()
    .setColor('#808080')
    .setTitle('An Error Occurred')
    .setDescription('Something went wrong while executing this command.')
    .addFields(
      { name: 'Error Message', value: `\`\`\`${error.message}\`\`\`` },
      { name: 'Command', value: `\`${interaction.commandName}\`` },
    )
    .setTimestamp();

  try {
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
  } catch {
    await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
  }
};
