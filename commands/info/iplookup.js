const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('iplookup')
    .setDescription('Fetches location details of an IP address')
    .addStringOption((option) =>
      option
        .setName('ip')
        .setDescription('The IP address to lookup')
        .setRequired(true),
    ),

  async execute(interaction) {
    const ip = interaction.options.getString('ip');

    try {
      const response = await axios.get(`http://ip-api.com/json/${ip}`);
      const data = response.data;

      if (data.status === 'fail') {
        return interaction.reply({
          content: `❌ **Error:** ${data.message}`,
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(`📍 IP Lookup: ${ip}`)
        .setColor(0x000000)
        .addFields(
          {
            name: '🌍 Country',
            value: `${data.country} (${data.countryCode})`,
            inline: true,
          },
          { name: '🏙️ City', value: `${data.city}`, inline: true },
          {
            name: '📍 Region',
            value: `${data.regionName} (${data.region})`,
            inline: true,
          },
          { name: '📮 ZIP Code', value: `${data.zip || 'N/A'}`, inline: true },
          { name: '💻 ISP', value: `${data.isp || 'N/A'}`, inline: true },
          {
            name: '🏢 Organization',
            value: `${data.org || 'N/A'}`,
            inline: true,
          },
          { name: '🕰️ Timezone', value: `${data.timezone}`, inline: true },
          {
            name: '📡 Coordinates',
            value: `🌎 ${data.lat}, ${data.lon}`,
            inline: false,
          },
        )
        .setFooter({ text: 'IP Lookup powered by ip-api.com' });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: '❌ Failed to fetch IP details. Please try again later.',
      });
    }
  },
};
