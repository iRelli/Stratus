const { SlashCommandBuilder, ChannelType } = require('discord.js');
const VoiceChannelCreate = require('../../models/VoiceChannelCreate');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vc')
    .setDescription('Manages temporary voice channels.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Sets up the configuration for voice channel creation.')
        .addStringOption(option =>
          option.setName('channelname')
            .setDescription('The name of the "Join to Create" channel.')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('categoryname')
            .setDescription('The name of the category where the temporary channels will be created.')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('name')
            .setDescription('The name template for the temporary channels. Use {username} to include the user\'s name.')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('limit')
            .setDescription('The user limit for the temporary channels. Set to 0 for unlimited.')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disables the voice channel creation.'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('rename')
        .setDescription('Renames the configuration for voice channel creation.')
        .addStringOption(option =>
          option.setName('name')
            .setDescription('The new name template for the temporary channels. Use {username} to include the user\'s name.')
            .setRequired(true))),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const subcommand = interaction.options.getSubcommand();

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
      const voiceChannelCreateData = new VoiceChannelCreate({
        guildId,
        channelId: channel.id,
        name,
        limit,
        categoryId: category.id,
      });

      await voiceChannelCreateData.save();

      await interaction.reply(`Voice channel creation setup complete. Temporary channels will be created under category "${categoryName}" with the name template "${name}" and user limit ${limit}.`);

    } else if (subcommand === 'disable') {
      // Remove the configuration from the database
      await VoiceChannelCreate.deleteOne({ guildId });
      await interaction.reply(`Voice channel creation has been disabled.`);

    } else if (subcommand === 'rename') {
      const name = interaction.options.getString('name');

      // Update the name configuration in the database
      await VoiceChannelCreate.findOneAndUpdate({ guildId }, { name });
      await interaction.reply(`Voice channel creation name template has been updated to "${name}".`);
    }
  },
};