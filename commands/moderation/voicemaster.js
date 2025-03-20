const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} = require('discord.js');
const VoiceChannelCreate = require('../../models/VoiceChannelCreate');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voicemaster')
    .setDescription('Manage the Join to Create system.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setup')
        .setDescription(
          'Creates the Join to Create category and voice channel.',
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('reset')
        .setDescription('Deletes the Join to Create system.'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('info')
        .setDescription('Shows the current Join to Create configuration.'),
    ),

  async execute(interaction) {
    const guild = interaction.guild;
    const subcommand = interaction.options.getSubcommand();

    const existingJ2C = await VoiceChannelCreate.findOne({
      guildId: guild.id,
      generator: true,
    });

    if (subcommand === 'setup') {
      if (existingJ2C) {
        return interaction.reply({
          content: '⚠️ The Join to Create system is already set up!',
          ephemeral: true,
        });
      }

      try {
        const category = await guild.channels.create({
          name: 'Join to Create',
          type: ChannelType.GuildCategory,
        });

        const j2cChannel = await guild.channels.create({
          name: 'Join to Create',
          type: ChannelType.GuildVoice,
          parent: category.id,
        });

        console.log(` Created J2C channel: ${j2cChannel.name}`);

        await VoiceChannelCreate.create({
          guildId: guild.id,
          channelId: j2cChannel.id,
          categoryId: category.id,
          generator: true,
        });

        console.log(` Saved J2C to database for Guild ${guild.id}`);

        await interaction.reply({
          content: ` Successfully created **Join to Create** system!`,
          ephemeral: true,
        });
      } catch (err) {
        console.error(' Error setting up J2C:', err);
        await interaction.reply({
          content: ' Failed to create Join to Create system.',
          ephemeral: true,
        });
      }
    } else if (subcommand === 'reset') {
      if (!existingJ2C) {
        return interaction.reply({
          content: '⚠️ No Join to Create system found for this server.',
          ephemeral: true,
        });
      }

      try {
        const j2cChannel = guild.channels.cache.get(existingJ2C.channelId);
        if (j2cChannel) {
          await j2cChannel.delete();
          console.log(`🗑️ Deleted J2C channel: ${j2cChannel.name}`);
        }

        const category = guild.channels.cache.get(existingJ2C.categoryId);
        if (category) {
          await category.delete();
          console.log(`🗑️ Deleted category: ${category.name}`);
        }

        await VoiceChannelCreate.deleteOne({
          guildId: guild.id,
          generator: true,
        });
        console.log(`🗑️ Removed J2C data from database for guild ${guild.id}`);

        await interaction.reply({
          content: ' Successfully removed **Join to Create** system!',
          ephemeral: true,
        });
      } catch (err) {
        console.error(' Error resetting J2C:', err);
        await interaction.reply({
          content: ' Failed to remove Join to Create system.',
          ephemeral: true,
        });
      }
    } else if (subcommand === 'info') {
      if (!existingJ2C) {
        return interaction.reply({
          content: '⚠️ No Join to Create system found in the database.',
          ephemeral: true,
        });
      }

      const category = guild.channels.cache.get(existingJ2C.categoryId);
      const j2cChannel = guild.channels.cache.get(existingJ2C.channelId);

      const embed = new EmbedBuilder()
        .setTitle('📊 Join to Create Configuration')
        .setColor('Blue')
        .addFields(
          { name: 'Guild ID', value: existingJ2C.guildId, inline: true },
          {
            name: 'J2C Channel',
            value: j2cChannel ? `<#${j2cChannel.id}>` : ' Not Found',
            inline: true,
          },
          {
            name: 'Category',
            value: category ? category.name : ' Not Found',
            inline: true,
          },
          {
            name: 'Category ID',
            value: existingJ2C.categoryId || ' Missing',
          },
          { name: 'Channel ID', value: existingJ2C.channelId || ' Missing' },
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
