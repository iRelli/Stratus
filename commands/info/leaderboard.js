const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const Levels = require('discord-xp');
const { Font, LeaderboardBuilder } = require('canvacord');
const path = require('path');
const Moderation = require('../../models/Moderation');

Font.loadDefault();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription("Displays the server's XP leaderboard.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName('view')
        .setDescription("Displays the server's XP leaderboard."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('reset')
        .setDescription('Resets all XP for users. (Moderator only)'),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const guildId = interaction.guild?.id;
      const userId = interaction.user.id;
      const subcommand = interaction.options.getSubcommand();

      if (!guildId) {
        return interaction.editReply({
          content: ' This command must be used in a server.',
        });
      }

      if (subcommand === 'view') {
        const rawLeaderboard = await Levels.fetchLeaderboard(guildId, 10);
        if (!rawLeaderboard.length) {
          return interaction.editReply({
            content: ' No leaderboard data found. Start chatting to earn XP!',
          });
        }

        const computedLeaderboard = await Levels.computeLeaderboard(
          interaction.client,
          rawLeaderboard,
          true,
        );

        const players = await Promise.all(
          computedLeaderboard.map(async (user) => {
            const member = await interaction.guild.members
              .fetch(user.userID)
              .catch(() => null);
            return {
              avatar:
                member?.user?.displayAvatarURL({
                  forceStatic: true,
                  extension: 'png',
                  size: 256,
                }) || 'https://cdn.discordapp.com/embed/avatars/0.png',
              username: user.username || 'Unknown',
              displayName: user.globalName || user.username || 'Unknown',
              level: user.level,
              xp: user.xp,
              rank: user.position,
            };
          }),
        );

        const backgroundPath = path.resolve(
          __dirname,
          '../../assets/OrangeMoon.jpg',
        );

        const lb = new LeaderboardBuilder()
          .setHeader({
            title: `${interaction.guild.name}`,
            image:
              interaction.guild.iconURL({
                forceStatic: true,
                extension: 'png',
                size: 256,
              }) || 'https://cdn.discordapp.com/embed/avatars/0.png',
            subtitle: `${interaction.guild.memberCount} members`,
          })
          .setPlayers(players)
          .setBackgroundColor('#FFFFF')
          .setBackground(backgroundPath);

        lb.setVariant('horizontal');

        const attachment1 = await lb.build({
          forceStatic: true,
          format: 'png',
        });
        const attachment = new AttachmentBuilder(attachment1, {
          name: 'leaderboard.png',
        });

        return interaction.editReply({ files: [attachment] });
      }

      if (subcommand === 'reset') {
        const moderationData = await Moderation.findOne({ guildId });
        if (!moderationData || !moderationData.moderators.has(userId)) {
          return interaction.editReply({
            content: '🚫 You do not have permission to reset the leaderboard.',
            ephemeral: true,
          });
        }

        await Levels.deleteGuild(guildId);
        return interaction.editReply({
          content: ' The leaderboard XP has been successfully reset!',
        });
      }
    } catch (error) {
      console.error(' Error generating leaderboard:', error);
      return interaction.editReply({
        content:
          ' An error occurred while generating the leaderboard. Try again later.',
      });
    }
  },
};
