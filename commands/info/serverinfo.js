const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCachedServerData } = require('../../utils/cacheHandler');
const Moderation = require('../../models/Moderation');
const errorHandler = require('../../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Displays detailed information about the server.'),

  async execute(interaction) {
    try {
      const guild = interaction.guild;
      const serverData = await getCachedServerData(
        interaction.client,
        guild.id,
      );
      const moderationData = await Moderation.findOne({ guildId: guild.id });

      const messageFilterStatus = moderationData?.messageFilterEnabled
        ? ` Enabled (${moderationData.filterLevel.toUpperCase()})`
        : ' Disabled';
      const antiRaidStatus = moderationData?.antiRaidEnabled
        ? ` Enabled (Threshold: ${moderationData.antiRaidThreshold}, Action: ${moderationData.antiRaidAction.toUpperCase()})`
        : ' Disabled';

      const embed = new EmbedBuilder()
        .setColor('#2F3136')
        .setTitle(`${guild.name} - Server Profile`)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .addFields(
          {
            name: '📌 **Basic Information**',
            value: `**Name:** ${guild.name}\n**ID:** ${guild.id}\n**Owner:** <@${serverData.ownerId}>\n**Created On:** ${serverData.createdAt}`,
          },
          { name: '----------------------', value: '⠀' },
          {
            name: '👥 **Member Overview**',
            value: `**Status:**\n🟢 Online: ${serverData.online || 0}\n🟠 Idle: ${serverData.idle || 0}\n🔴 DND: ${serverData.dnd || 0}\n⚪ Offline: ${serverData.offline || 0}`,
            inline: true,
          },
          {
            name: '📱 **Devices**',
            value: `**Mobile:** ${serverData.mobile || 0}`,
            inline: true,
          },
          {
            name: '📊 **Count**',
            value: `**Total:** ${serverData.totalMembers || 0}\n🤖 Bots: ${serverData.bots || 0}`,
            inline: true,
          },
          { name: '----------------------', value: '⠀' },
          {
            name: '💎 **Boosts & Security**',
            value: `** Verification:** ${serverData.verificationLevel}\n**💠 Boosts:** ${serverData.boostCount || 0}\n**Level:** ${serverData.boostLevel}`,
          },
          { name: '----------------------', value: '⠀' },
          {
            name: '🛡️ **Server Protection**',
            value: `📝 **Message Filtering:** ${messageFilterStatus}\n🚨 **Anti-Raid Protection:** ${antiRaidStatus}`,
          },
          { name: '----------------------', value: '⠀' },
          {
            name: '📂 **Assets**',
            value: `**🔰 Roles & Emojis**\n🎭 Roles: ${serverData.rolesCount || 0}\n😀 Emojis: ${serverData.emojisCount || 0}`,
          },
        )
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      return errorHandler(interaction, error);
    }
  },
};
