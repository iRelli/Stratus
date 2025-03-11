const { SlashCommandBuilder, ChannelType } = require('discord.js');
const VoiceChannelCreate = require('../../models/VoiceChannelCreate');
const VoiceChannelUser = require('../../models/VoiceChannelUser');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vc')
    .setDescription('Manages temporary voice channels.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setup')
        .setDescription('Sets up the configuration for voice channel creation.')
        .addStringOption((option) =>
          option
            .setName('channelname')
            .setDescription('The name of the "Join to Create" channel.')
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('categoryname')
            .setDescription(
              'The name of the category where the temporary channels will be created.',
            )
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription(
              "The name template for the temporary channels. Use {username} to include the user's name.",
            )
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName('limit')
            .setDescription(
              'The user limit for the temporary channels. Set to 0 for unlimited.',
            )
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('disable')
        .setDescription('Disables the voice channel creation.'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('rename')
        .setDescription('Renames the configuration for voice channel creation.')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription(
              "The new name template for the temporary channels. Use {username} to include the user's name.",
            )
            .setRequired(true),
        ),
    ),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const subcommand = interaction.options.getSubcommand();
    const serverData = await VoiceChannelCreate.findOne({ guildId });

    if (subcommand === 'setup') {
      const channelName = interaction.options.getString('channelname');
      const categoryName = interaction.options.getString('categoryname');
      const name = interaction.options.getString('name');
      const limit = interaction.options.getInteger('limit') || 0;

      // Create the category
      const category = await interaction.guild.channels.create({
        name: categoryName,
        type: ChannelType.GuildCategory,
      });

      // Create the "Join to Create" channel
      const channel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: category.id,
      });

      // Save the configuration to the database
      await VoiceChannelCreate.create({
        guildId: interaction.guild.id,
        channelId: channel.id,
        categoryId: category.id,
        name: name,
        limit: limit,
      });

      await interaction.reply(`Voice channel creation setup complete. Temporary channels will be created under category "${categoryName}" with the name template "${name}" and user limit ${limit}.`);

    } else if (subcommand === 'disable') {
      if (!serverData)
        return interaction.reply("The System is not setup.");
      await VoiceChannelCreate.deleteOne({ guildId });
      await interaction.reply(`Voice channel creation has been disabled.`);
    } else if (subcommand === 'rename') {
      const userData = await VoiceChannelUser.findOne({ guildId });
      if (!userData) return interaction.reply('You do not own a voice channel.');

      const rename = interaction.options.getString('name');
      const vc = await interaction.guild.channels.fetch(userData.channelId);
      if (!vc) return interaction.reply('You do not own that voice channel.');

      try {
        await vc.setName(rename);
        await interaction.reply('Channel renamed successfully.');
      } catch (error) {
        console.error('Error renaming channel:', error);
        await interaction.reply('Error renaming the channel.');
      }
    }
  },
};