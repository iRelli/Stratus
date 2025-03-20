const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Moderation = require('../../models/Moderation');
const errorHandler = require('../../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Manage moderation log channel setup.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('create')
        .setDescription('Creates a moderation log channel.'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('reset')
        .setDescription('Resets and removes the moderation log channel.'),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      const guild = interaction.guild;
      const subcommand = interaction.options.getSubcommand();

      let moderationData = interaction.client.cache.servers.get(guild.id);

      if (!moderationData) {
        moderationData =
          (await Moderation.findOne({ guildId: guild.id })) ||
          new Moderation({ guildId });
        interaction.client.cache.servers.set(guild.id, moderationData);
      }

      if (subcommand === 'create') {
        if (moderationData.logChannelId) {
          return interaction.reply({
            content: `⚠️ The moderation log channel is already set up: <#${moderationData.logChannelId}>`,
            flags: 64,
          });
        }

        let logChannel =
          guild.channels.cache.get(moderationData.logChannelId) ||
          guild.channels.cache.find((channel) => channel.name === 'moderation');

        if (!logChannel) {
          logChannel = await guild.channels.create({
            name: 'moderation',
            type: 0,
            permissionOverwrites: [
              {
                id: guild.roles.everyone.id,
                deny: ['ViewChannel'],
              },
            ],
          });
        }

        moderationData.logChannelId = logChannel.id;
        await moderationData.save();
        interaction.client.cache.servers.set(guild.id, moderationData);

        return interaction.reply({
          content: ` **Moderation log channel set up successfully:** ${logChannel}`,
          flags: 64,
        });
      }

      if (subcommand === 'reset') {
        if (!moderationData.logChannelId) {
          return interaction.reply({
            content: '⚠️ No existing moderation log channel found.',
            flags: 64,
          });
        }

        const logChannel = guild.channels.cache.get(
          moderationData.logChannelId,
        );
        if (logChannel) {
          await logChannel.delete().catch(console.error);
        }

        moderationData.logChannelId = null;
        await moderationData.save();
        interaction.client.cache.servers.set(guild.id, moderationData);

        return interaction.reply({
          content: ' Moderation log channel has been **reset** and removed.',
          flags: 64,
        });
      }
    } catch (error) {
      return errorHandler(interaction, error);
    }
  },
};
