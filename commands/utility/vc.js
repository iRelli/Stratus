const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const VoiceChannelCreate = require('../../models/VoiceChannelCreate');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vc')
    .setDescription('Manage your private voice channel.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('ban')
        .setDescription('Bans a user from your voice channel.')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('User to ban')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('permit')
        .setDescription('Allows a user to join your voice channel.')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('User to allow')
            .setRequired(true),
        ),
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
      subcommand
        .setName('hide')
        .setDescription('Hides your voice channel from others.'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('unhide')
        .setDescription('Makes your voice channel visible to everyone.'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('invite')
        .setDescription('Sends a voice channel invite to a user via DM.')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('User to invite')
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
        .setName('claim')
        .setDescription('Claim a voice channel if the owner has left.'),
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const userDisplayName = interaction.member.displayName;

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

    if (subcommand === 'ban') {
      const targetUser = interaction.options.getUser('user');
      const member = interaction.guild.members.cache.get(targetUser.id);

      if (
        member &&
        member.voice.channel &&
        member.voice.channel.id === channel.id
      ) {
        await member.voice.disconnect('Banned from the voice channel.');
      }

      await channel.permissionOverwrites.edit(targetUser.id, {
        Connect: false,
      });

      return interaction.reply({
        content: `✅ Banned <@${targetUser.id}> from your voice channel and disconnected them.`,
        ephemeral: true,
      });
    }

    if (subcommand === 'permit') {
      const targetUser = interaction.options.getUser('user');
      await channel.permissionOverwrites.edit(targetUser.id, {
        Connect: true,
      });
      return interaction.reply({
        content: `✅ Allowed <@${targetUser.id}> to join your voice channel.`,
        ephemeral: true,
      });
    }

    if (subcommand === 'lock') {
      await channel.permissionOverwrites.edit(
        interaction.guild.roles.everyone,
        {
          Connect: false,
        },
      );
      return interaction.reply({
        content: '✅ Your voice channel is now locked.',
        ephemeral: true,
      });
    }

    if (subcommand === 'unlock') {
      await channel.permissionOverwrites.edit(
        interaction.guild.roles.everyone,
        {
          Connect: true,
        },
      );
      return interaction.reply({
        content: '✅ Your voice channel is now unlocked.',
        ephemeral: true,
      });
    }

    if (subcommand === 'hide') {
      await channel.permissionOverwrites.edit(
        interaction.guild.roles.everyone,
        {
          ViewChannel: false,
        },
      );
      return interaction.reply({
        content: '✅ Your voice channel is now hidden.',
        ephemeral: true,
      });
    }

    if (subcommand === 'unhide') {
      await channel.permissionOverwrites.edit(
        interaction.guild.roles.everyone,
        {
          ViewChannel: true,
        },
      );
      return interaction.reply({
        content: '✅ Your voice channel is now visible.',
        ephemeral: true,
      });
    }

    if (subcommand === 'invite') {
      const targetUser = interaction.options.getUser('user');

      try {
        const invite = await channel.createInvite({
          maxAge: 3600,
          maxUses: 1,
          unique: true,
          reason: `Invite created by ${interaction.user.tag}`,
        });

        await targetUser.send({
          content: `📩 **You have been invited to join a voice channel!**\n🔗 Click to join: ${invite.url}`,
        });

        return interaction.reply({
          content: `✅ Successfully sent an invite to <@${targetUser.id}> via DM.`,
          ephemeral: true,
        });
      } catch (error) {
        console.error('❌ Error sending invite via DM:', error);

        return interaction.reply({
          content: `❌ Could not send the invite to <@${targetUser.id}>. They may have DMs disabled.`,
          ephemeral: true,
        });
      }
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

      const newChannelName = `${userDisplayName}'s VC`;
      await channel.setName(newChannelName);
      await VoiceChannelCreate.findOneAndUpdate(
        { guildId, channelId: vcData.channelId },
        { ownerId: userId, channelName: newChannelName },
      );

      return interaction.reply({
        content: `✅ You have claimed ownership of the voice channel and renamed it to **${newChannelName}**.`,
        ephemeral: true,
      });
    }
  },
};
