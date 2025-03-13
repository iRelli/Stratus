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
        .setDescription(
          'Deletes the Join to Create system (voice channel, category, and database).',
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('info')
        .setDescription('Shows the current Join to Create configuration.'),
    ),

  async execute(interaction) {
    const guild = interaction.guild;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'setup') {
      try {
        const category = await guild.channels.create({
          name: 'Join to Create',
          type: ChannelType.GuildCategory,
        });

        console.log(`✅ Created category: ${category.name}`);

        const j2cChannel = await guild.channels.create({
          name: 'Join to Create',
          type: ChannelType.GuildVoice,
          parent: category.id,
        });

        console.log(`✅ Created J2C channel: ${j2cChannel.name}`);

        await VoiceChannelCreate.findOneAndUpdate(
          { guildId: guild.id },
          {
            guildId: guild.id,
            channelId: j2cChannel.id,
            categoryId: category.id,
            channelName: j2cChannel.name,
          },
          { upsert: true },
        );

        console.log(`✅ Saved to database: Guild ${guild.id}`);

        await interaction.reply({
          content: `✅ Successfully created **Join to Create** system!`,
          ephemeral: true,
        });
      } catch (err) {
        console.error('❌ Error setting up J2C:', err);
        await interaction.reply({
          content: '❌ Failed to create Join to Create system.',
          ephemeral: true,
        });
      }
    } else if (subcommand === 'reset') {
      try {
        const j2cData = await VoiceChannelCreate.findOne({ guildId: guild.id });

        if (!j2cData) {
          return interaction.reply({
            content: '❌ No Join to Create system found for this server.',
            ephemeral: true,
          });
        }

        const j2cChannel = await guild.channels.cache.get(j2cData.channelId);
        if (j2cChannel) {
          await j2cChannel.delete();
          console.log(`🗑️ Deleted J2C channel: ${j2cChannel.name}`);
        }

        const category = await guild.channels.cache.get(j2cData.categoryId);
        if (category) {
          await category.delete();
          console.log(`🗑️ Deleted category: ${category.name}`);
        } else {
          console.log(`⚠️ No category found for ID: ${j2cData.categoryId}`);
        }

        await VoiceChannelCreate.deleteOne({ guildId: guild.id });
        console.log(`🗑️ Removed J2C data from database for guild ${guild.id}`);

        await interaction.reply({
          content: '✅ Successfully removed **Join to Create** system!',
          ephemeral: true,
        });
      } catch (err) {
        console.error('❌ Error resetting J2C:', err);
        await interaction.reply({
          content: '❌ Failed to remove Join to Create system.',
          ephemeral: true,
        });
      }
    } else if (subcommand === 'info') {
      try {
        const j2cData = await VoiceChannelCreate.findOne({ guildId: guild.id });

        if (!j2cData) {
          return interaction.reply({
            content: '❌ No Join to Create system found in the database.',
            ephemeral: true,
          });
        }

        const category = guild.channels.cache.get(j2cData.categoryId);
        const j2cChannel = guild.channels.cache.get(j2cData.channelId);

        const embed = new EmbedBuilder()
          .setTitle('📊 Join to Create Configuration')
          .setColor('Blue')
          .addFields(
            { name: 'Guild ID', value: j2cData.guildId, inline: true },
            {
              name: 'J2C Channel',
              value: j2cChannel ? `<#${j2cChannel.id}>` : '❌ Not Found',
              inline: true,
            },
            {
              name: 'Category',
              value: category ? category.name : '❌ Not Found',
              inline: true,
            },
            { name: 'Category ID', value: j2cData.categoryId || '❌ Missing' },
            { name: 'Channel ID', value: j2cData.channelId || '❌ Missing' },
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (err) {
        console.error('❌ Error fetching J2C info:', err);
        await interaction.reply({
          content: '❌ Failed to retrieve Join to Create information.',
          ephemeral: true,
        });
      }
    }
  },
};
