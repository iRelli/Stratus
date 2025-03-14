const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');
const VoiceChannelCreate = require('../../models/VoiceChannelCreate');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vc')
    .setDescription('Manage your private voice channel.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('ban')
        .setDescription('Bans a user from your voice channel.'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('permit')
        .setDescription('Allows a user to join your voice channel.'),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('lock').setDescription('Locks your voice channel.'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('unlock')
        .setDescription('Unlocks your voice channel.'),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('hide').setDescription('Hides your voice channel.'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('unhide')
        .setDescription('Makes your voice channel visible to everyone.'),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('invite').setDescription('Invite a user to your VC.'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('limit')
        .setDescription('Sets a user limit for your voice channel.')
        .addIntegerOption((option) =>
          option
            .setName('number')
            .setDescription('The user limit (0 for unlimited)')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('claim')
        .setDescription('Claim a voice channel if the owner has left.'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('rename')
        .setDescription("'Renames your voice channel."),
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const userVoiceChannel = interaction.member.voice.channel;

    if (!userVoiceChannel) {
      return interaction.reply({
        content: '❌ You are not in a voice channel.',
        ephemeral: true,
      });
    }

    const vcData = await VoiceChannelCreate.findOne({
      guildId,
      channelId: userVoiceChannel.id,
    });

    if (!vcData) {
      return interaction.reply({
        content: '❌ This voice channel is not registered in the database.',
        ephemeral: true,
      });
    }

    if (subcommand !== 'claim' && vcData.ownerId !== userId) {
      return interaction.reply({
        content: '❌ You are not the owner of this voice channel.',
        ephemeral: true,
      });
    }

    const channel = interaction.guild.channels.cache.get(vcData.channelId);
    if (!channel) {
      return interaction.reply({
        content: '❌ Your voice channel could not be found.',
        ephemeral: true,
      });
    }

    if (
      subcommand === 'ban' ||
      subcommand === 'permit' ||
      subcommand === 'invite'
    ) {
      const members = userVoiceChannel.members
        .filter((m) => !m.user.bot && m.id !== userId)
        .map((m) => ({
          label: m.displayName,
          description: `@${m.user.username}`,
          value: m.id,
        }));

      if (members.length === 0) {
        return interaction.reply({
          content: `❌ No users available to ${subcommand}.`,
          ephemeral: true,
        });
      }

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`vc_${subcommand}`)
        .setPlaceholder(`🔍 Select a user to ${subcommand}...`)
        .addOptions(members.slice(0, 25));

      const row = new ActionRowBuilder().addComponents(selectMenu);

      return interaction.reply({
        content: `🔹 Select a user to **${subcommand}**:`,
        components: [row],
        ephemeral: true,
      });
    }

    if (subcommand === 'lock') {
      if (
        !channel
          .permissionsFor(interaction.guild.roles.everyone)
          .has(PermissionFlagsBits.Connect)
      ) {
        return interaction.reply({
          content: '🔒 Your voice channel is already locked.',
          ephemeral: true,
        });
      }
      await channel.permissionOverwrites.edit(
        interaction.guild.roles.everyone,
        {
          Connect: false,
        },
      );
      return interaction.reply({
        content: '🔒 Your voice channel is now locked.',
        ephemeral: true,
      });
    }

    if (subcommand === 'unlock') {
      if (
        channel
          .permissionsFor(interaction.guild.roles.everyone)
          .has(PermissionFlagsBits.Connect)
      ) {
        return interaction.reply({
          content: '🔓 Your voice channel is already unlocked.',
          ephemeral: true,
        });
      }
      await channel.permissionOverwrites.edit(
        interaction.guild.roles.everyone,
        {
          Connect: true,
        },
      );
      return interaction.reply({
        content: '🔓 Your voice channel is now unlocked.',
        ephemeral: true,
      });
    }

    if (subcommand === 'hide') {
      if (
        !channel
          .permissionsFor(interaction.guild.roles.everyone)
          .has(PermissionFlagsBits.ViewChannel)
      ) {
        return interaction.reply({
          content: '🙈 Your voice channel is already hidden.',
          ephemeral: true,
        });
      }
      await channel.permissionOverwrites.edit(
        interaction.guild.roles.everyone,
        {
          ViewChannel: false,
        },
      );
      return interaction.reply({
        content: '🙈 Your voice channel is now hidden.',
        ephemeral: true,
      });
    }

    if (subcommand === 'unhide') {
      if (
        channel
          .permissionsFor(interaction.guild.roles.everyone)
          .has(PermissionFlagsBits.ViewChannel)
      ) {
        return interaction.reply({
          content: '👁️ Your voice channel is already visible.',
          ephemeral: true,
        });
      }
      await channel.permissionOverwrites.edit(
        interaction.guild.roles.everyone,
        {
          ViewChannel: true,
        },
      );
      return interaction.reply({
        content: '👁️ Your voice channel is now visible.',
        ephemeral: true,
      });
    }

    if (subcommand === 'limit') {
      const limit = interaction.options.getInteger('number');
      await channel.setUserLimit(limit);
      return interaction.reply({
        content: `✅ User limit set to **${limit === 0 ? 'Unlimited' : limit}**.`,
        ephemeral: true,
      });
    }

    if (subcommand === 'claim') {
      if (vcData.ownerId === userId) {
        return interaction.reply({
          content: '❌ You are already the owner of this channel.',
          ephemeral: true,
        });
      }

      const ownerInChannel = channel.members.has(vcData.ownerId);
      if (ownerInChannel) {
        return interaction.reply({
          content:
            '❌ The current owner is still in the voice channel. You cannot claim it.',
          ephemeral: true,
        });
      }

      await VoiceChannelCreate.findOneAndUpdate(
        { guildId, channelId: vcData.channelId },
        { ownerId: userId },
      );

      return interaction.reply({
        content: `✅ You have claimed ownership of the voice channel.`,
        ephemeral: true,
      });
    }
    if (subcommand === 'rename') {
      const newName = interaction.options.getString('name');
      if (newName.length > 32) {
        return interaction.reply({
          content: '❌ Channel name cannot exceed 32 characters.',
          ephemeral: true,
        });
      }
      await userVoiceChannel.setName(newName);
      return interaction.reply({
        content: `✅ Your voice channel has been renamed to **${newName}**.`,
        ephemeral: true,
      });
    }
  },
};
