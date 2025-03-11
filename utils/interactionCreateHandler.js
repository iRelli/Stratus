
module.exports = async (client, interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId === 'enable_dj') {
      if (interaction.user.id !== interaction.guild.ownerId) {
        return interaction.reply({ content: 'Only the server owner can enable the DJ system.', ephemeral: true });
      }

      client.djEnabled.set(interaction.guild.id, true);
      return interaction.reply({ content: 'DJ system enabled.', ephemeral: true });
    }

    if (interaction.customId === 'disable_dj') {
      if (interaction.user.id !== interaction.guild.ownerId) {
        return interaction.reply({ content: 'Only the server owner can disable the DJ system.', ephemeral: true });
      }

      client.djEnabled.set(interaction.guild.id, false);
      return interaction.reply({ content: 'DJ system disabled.', ephemeral: true });
    }
  }
  
};