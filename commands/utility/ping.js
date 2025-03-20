const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription("Checks the bot's latency."),

  async execute(interaction) {
    try {
      const botLatency = Date.now() - interaction.createdTimestamp;
      const apiLatency = interaction.client.ws.ping;

      const embed = new EmbedBuilder()
        .setColor('#2F3136')
        .setTitle('🏓 Pong!')
        .addFields(
          { name: '📶 Bot Latency', value: `${botLatency}ms`, inline: true },
          { name: '🌐 API Latency', value: `${apiLatency}ms`, inline: true },
        )
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error executing /ping command:', error);
      return interaction.reply({
        content: ' An error occurred while fetching the latency.',
        flags: 64,
      });
    }
  },
};
