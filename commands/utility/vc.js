const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const VoiceChannelCreate = require('../../models/VoiceChannelCreate');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vc')
    .setDescription('Manage your private voice channel.')
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
        .setDescription('Makes your voice channel visible.'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('rename')
        .setDescription('Renames your voice channel.')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('New channel name.')
            .setRequired(true),
        ),
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
        .setName('permit')
        .setDescription('Allows a user to join your voice channel.'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('ban')
        .setDescription('Bans a user from your voice channel.'),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('invite').setDescription('Invite a user to your VC.'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('claim')
        .setDescription('Claim a voice channel if the owner has left.'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('transfer')
        .setDescription('Transfer VC ownership to another member.'),
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const userVoiceChannel = interaction.member.voice.channel;

    if (!userVoiceChannel) {
      return interaction.reply({
        content: ' You are not in a voice channel.',
        ephemeral: true,
      });
    }

    const vcData = await VoiceChannelCreate.findOne({
      guildId,
      channelId: userVoiceChannel.id,
    });

    if (!vcData) {
      return interaction.reply({
        content: ' This voice channel is not registered in the database.',
        ephemeral: true,
      });
    }

    if (subcommand !== 'claim' && vcData.ownerId !== userId) {
      return interaction.reply({
        content: ' You are not the owner of this voice channel.',
        ephemeral: true,
      });
    }

    const channel = interaction.guild.channels.cache.get(vcData.channelId);
    if (!channel) {
      return interaction.reply({
        content: ' Your voice channel could not be found.',
        ephemeral: true,
      });
    }

    switch (subcommand) {
      case 'lock':
        if (!channel.permissionsFor(guildId).has(PermissionFlagsBits.Connect)) {
          return interaction.reply({
            content: ' Your voice channel is already locked.',
            ephemeral: true,
          });
        }
        await channel.permissionOverwrites.edit(guildId, { Connect: false });
        return interaction.reply({
          content: ' Your voice channel is now locked.',
          ephemeral: true,
        });

      case 'unlock':
        if (channel.permissionsFor(guildId).has(PermissionFlagsBits.Connect)) {
          return interaction.reply({
            content: ' Your voice channel is already unlocked.',
            ephemeral: true,
          });
        }
        await channel.permissionOverwrites.edit(guildId, { Connect: true });
        return interaction.reply({
          content: ' Your voice channel is now unlocked.',
          ephemeral: true,
        });

      case 'hide':
        await channel.permissionOverwrites.edit(guildId, {
          ViewChannel: false,
        });
        return interaction.reply({
          content: '🙈 Your voice channel is now hidden.',
          ephemeral: true,
        });

      case 'unhide':
        await channel.permissionOverwrites.edit(guildId, { ViewChannel: true });
        return interaction.reply({
          content: ' Your voice channel is now visible.',
          ephemeral: true,
        });

      case 'rename':
        const newName = interaction.options.getString('name');
        await channel.setName(newName);
        return interaction.reply({
          content: ` Your VC has been renamed to **${newName}**.`,
          ephemeral: true,
        });

      case 'limit':
        const limit = interaction.options.getInteger('number');
        await channel.setUserLimit(limit);
        return interaction.reply({
          content: ` User limit set to **${limit === 0 ? 'Unlimited' : limit}**.`,
          ephemeral: true,
        });

      case 'permit':
      case 'ban':
      case 'invite': {
        const members = userVoiceChannel.members
          .filter((m) => !m.user.bot && m.id !== userId)
          .map((m) => ({
            label: m.displayName,
            description: `@${m.user.username}`,
            value: m.id,
          }));

        if (members.length === 0) {
          return interaction.reply({
            content: ` No users available to ${subcommand}.`,
            ephemeral: true,
          });
        }

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`vc_${subcommand}`)
          .setPlaceholder(` Select a user to ${subcommand}...`)
          .addOptions(members.slice(0, 25));

        const row = new ActionRowBuilder().addComponents(selectMenu);

        return interaction.reply({
          content: `🔹 Select a user to **${subcommand}**:`,
          components: [row],
          ephemeral: true,
        });
      }

      case 'claim':
        const originalOwner = await interaction.guild.members
          .fetch(vcData.ownerId)
          .catch(() => null);
        if (originalOwner && userVoiceChannel.members.has(originalOwner.id)) {
          return interaction.reply({
            content: ' The original owner is still in the voice channel.',
            ephemeral: true,
          });
        }

        await VoiceChannelCreate.findOneAndUpdate(
          { guildId, channelId: vcData.channelId },
          { ownerId: userId },
        );

        await channel.setName(`${interaction.user.displayName}'s VC`);

        return interaction.reply({
          content: ' You have successfully claimed ownership.',
          ephemeral: true,
        });

      case 'transfer': {
        const membersInChannel = userVoiceChannel.members
          .filter((m) => !m.user.bot && m.id !== user.id)
          .map((m) => ({
            label: m.displayName,
            description: `@${m.user.username}`,
            value: m.id,
          }));

        if (membersInChannel.length === 0) {
          return interaction.reply({
            content: ' No eligible members to transfer ownership.',
            ephemeral: true,
          });
        }

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`transfer_select_${userVoiceChannel.id}`)
          .setPlaceholder(' Select a user to transfer ownership...')
          .addOptions(membersInChannel);

        return interaction.reply({
          content: ' Select a user to transfer VC ownership:',
          components: [new ActionRowBuilder().addComponents(selectMenu)],
          ephemeral: true,
        });
      }
    }
  },
};
