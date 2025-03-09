const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Moderation = require('../../models/Moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Displays all the moderation settings for this server.'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const guildId = interaction.guild.id;

      // ✅ Ensure Default Configuration Exists
      let moderationData = await Moderation.findOne({ guildId });
      if (!moderationData) {
        await ensureGuildConfig(guildId);
        moderationData = await Moderation.findOne({ guildId });
      }

      // ✅ Create Embed with Default Values if Necessary
      const embed = new EmbedBuilder()
        .setColor('#2F3136')
        .setTitle('⚙️ Server Configuration')
        .setDescription(
          'Here are the current moderation settings for this server:',
        )
        .addFields(
          {
            name: '📌 **Moderation Log Channel**',
            value: moderationData.logChannelId
              ? `<#${moderationData.logChannelId}>`
              : 'Not Set',
            inline: true,
          },
          {
            name: '⚠️ **Warning Limit**',
            value: `${moderationData.warningLimit ?? 5}`,
            inline: true,
          },
          {
            name: '🛑 **Anti-Raid Protection**',
            value: moderationData.antiRaidEnabled
              ? '✅ Enabled'
              : '❌ Disabled',
            inline: true,
          },
          {
            name: '👥 **Anti-Raid Threshold**',
            value: `${moderationData.antiRaidThreshold ?? 5} joins`,
            inline: true,
          },
          {
            name: '🔨 **Anti-Raid Action**',
            value: moderationData.antiRaidAction ?? 'kick',
            inline: true,
          },
          {
            name: '⏳ **Rate Limit Protection**',
            value: moderationData.rateLimitEnabled
              ? '✅ Enabled'
              : '❌ Disabled',
            inline: true,
          },
          {
            name: '💬 **Rate Limit Threshold**',
            value: `${moderationData.rateLimitThreshold ?? 5} messages`,
            inline: true,
          },
          {
            name: '⏰ **Rate Limit Duration**',
            value: `${moderationData.rateLimitDuration ?? 10} seconds`,
            inline: true,
          },
          {
            name: '🔒 **Message Filtering**',
            value: moderationData.messageFilterEnabled
              ? '✅ Enabled'
              : '❌ Disabled',
            inline: true,
          },
          {
            name: '⚙️ **Filter Level**',
            value: moderationData.filterLevel ?? 'normal',
            inline: true,
          },
          {
            name: '📈 **Leveling System**',
            value: moderationData.levelingEnabled
              ? '✅ Enabled'
              : '❌ Disabled',
            inline: true,
          },
          {
            name: '⚡ **XP Multiplier**',
            value: `${moderationData.xpMultiplier ?? 1.0}`,
            inline: true,
          },
        )
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('❌ Error fetching moderation settings:', error);
      return interaction.editReply({
        content:
          '❌ An error occurred while fetching the moderation settings. Try again later.',
      });
    }
  },
};

// ✅ Function to Ensure Default Moderation Schema Exists
async function ensureGuildConfig(guildId) {
  try {
    let moderationData = await Moderation.findOne({ guildId });

    if (!moderationData) {
      moderationData = new Moderation({
        guildId,
        logChannelId: null,
        warningLimit: 5,
        antiRaidEnabled: false,
        antiRaidThreshold: 5,
        antiRaidAction: 'kick',
        antiRaidTimeframe: 10,
        rateLimitEnabled: false,
        rateLimitThreshold: 5,
        rateLimitTimeframe: 5,
        rateLimitDuration: 10,
        messageFilterEnabled: false,
        filterLevel: 'normal',
        levelingEnabled: false,
        xpMultiplier: 1.0,
      });

      await moderationData.save();
      console.log(
        `✅ Created default moderation settings for guild: ${guildId}`,
      );
    }
  } catch (error) {
    console.error(
      `❌ Error ensuring moderation settings for ${guildId}:`,
      error,
    );
  }
}
