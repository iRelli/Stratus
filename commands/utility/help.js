const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Displays all available commands with pagination.'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const commandFolders = fs.readdirSync(path.join(__dirname, '../'));
      let commands = [];

      for (const folder of commandFolders) {
        const files = fs
          .readdirSync(path.join(__dirname, `../${folder}`))
          .filter((file) => file.endsWith('.js'));
        commands.push(
          ...files.map((file) => require(`../${folder}/${file}`).data),
        );
      }

      if (commands.length === 0) {
        return interaction.editReply({
          content: '⚠️ No commands found.',
          ephemeral: true,
        });
      }

      let page = 0;
      const perPage = 3;
      const totalPages = Math.ceil(commands.length / perPage);

      const generateEmbed = () => {
        const start = page * perPage;
        const end = start + perPage;
        const commandList = commands
          .slice(start, end)
          .map(
            (cmd) =>
              `**/${cmd.name}** - ${cmd.description || 'No description available'}`,
          )
          .join('\n');

        return new EmbedBuilder()
          .setColor('#2F3136')
          .setTitle('📜 Stratus Help Menu')
          .setDescription(commandList || 'No commands available.')
          .setFooter({ text: `Page ${page + 1} of ${totalPages}` })
          .setTimestamp();
      };

      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('◀️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId('stop')
          .setLabel('⏹️')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('▶️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page + 1 >= totalPages),
      );

      const message = await interaction.editReply({
        embeds: [generateEmbed()],
        components: [buttonRow],
        ephemeral: true,
      });

      const filter = (i) => i.user.id === interaction.user.id;
      const collector = message.createMessageComponentCollector({
        filter,
        time: 60000,
      });

      collector.on('collect', async (btn) => {
        if (btn.customId === 'prev' && page > 0) page--;
        else if (btn.customId === 'next' && page + 1 < totalPages) page++;
        else if (btn.customId === 'stop') {
          await btn.update({
            content: '⏹️ Help menu closed.',
            components: [],
            embeds: [],
          });
          collector.stop();
          return;
        }

        await btn.update({
          embeds: [generateEmbed()],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('◀️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 0),
              new ButtonBuilder()
                .setCustomId('stop')
                .setLabel('⏹️')
                .setStyle(ButtonStyle.Danger),
              new ButtonBuilder()
                .setCustomId('next')
                .setLabel('▶️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page + 1 >= totalPages),
            ),
          ],
        });
      });

      collector.on('end', async () => {
        try {
          await interaction.editReply({
            content: '⏳ Help menu expired. Run `/help` again.',
            components: [],
            embeds: [],
          });
        } catch (error) {
          console.log('Help menu already deleted.');
        }
      });
    } catch (error) {
      console.error(' Error generating help menu:', error);
      return interaction.editReply({
        content:
          ' An error occurred while generating the help menu. Try again later.',
      });
    }
  },
};
