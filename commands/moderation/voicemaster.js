const {
  SlashCommandBuilder,
  ChannelType,
  PermissionsBitField,
} = require('discord.js');
const VoiceMaster = require('../../models/VoiceMaster');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voicemaster')
    .setDescription('Manages temporary voice channels.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setup')
        .setDescription('Sets up the VoiceMaster category and channel.'),
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'setup') {
      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.Administrator,
        )
      ) {
        return interaction.reply({
          content: '❌ You do not have permission to use this command.',
          ephemeral: true,
        });
      }

      try {
        const guildId = interaction.guild.id;

        let voiceMasterData = await VoiceMaster.findOne({ guildId });
        if (voiceMasterData) {
          return interaction.reply({
            content: '❌ VoiceMaster is already set up for this server.',
            ephemeral: true,
          });
        }

        const category = await interaction.guild.channels.create({
          name: 'Temporary Channels',
          type: ChannelType.GuildCategory,
        });

        const voiceChannel = await interaction.guild.channels.create({
          name: 'Join to Create',
          type: ChannelType.GuildVoice,
          parent: category.id,
        });

        voiceMasterData = new VoiceMaster({
          guildId,
          categoryId: category.id,
          channelId: voiceChannel.id,
        });
        await voiceMasterData.save();

        return interaction.reply({
          content: `✅ VoiceMaster setup complete. Temporary voice channels will be created under **${category.name}**.`,
          ephemeral: true,
        });
      } catch (error) {
        console.error('❌ Error setting up VoiceMaster:', error);
        return interaction.reply({
          content:
            '❌ An error occurred while setting up VoiceMaster. Try again later.',
          ephemeral: true,
        });
      }
    }
  },
};
