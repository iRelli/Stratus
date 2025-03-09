const { EmbedBuilder } = require('discord.js');
const Moderation = require('../models/Moderation');

const recentJoins = new Map();

module.exports = {
  name: 'guildMemberAdd',
  async execute(client, member) {
    const guildId = member.guild.id;
    let moderationData = await Moderation.findOne({ guildId });

    if (!moderationData || !moderationData.antiRaidEnabled) return;

    const now = Date.now();
    if (!recentJoins.has(guildId)) {
      recentJoins.set(guildId, []);
    }

    const timestamps = recentJoins.get(guildId);
    timestamps.push(now);

    while (
      timestamps.length > 0 &&
      now - timestamps[0] > moderationData.antiRaidTimeframe * 1000
    ) {
      timestamps.shift();
    }

    if (timestamps.length >= moderationData.antiRaidThreshold) {
      const action = moderationData.antiRaidAction;

      const membersToPunish = timestamps.map((timestamp) =>
        member.guild.members.cache.find((m) => m.joinedTimestamp === timestamp),
      );

      for (const raidMember of membersToPunish) {
        if (!raidMember || !raidMember.moderatable) continue;

        if (action === 'ban') {
          await raidMember.ban({ reason: 'Anti-raid protection triggered.' });
        } else {
          await raidMember.kick('Anti-raid protection triggered.');
        }
      }

      if (moderationData.logChannelId) {
        const logChannel = member.guild.channels.cache.get(
          moderationData.logChannelId,
        );
        if (logChannel) {
          const raidEmbed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('🚨 Anti-Raid Protection Triggered')
            .setDescription(
              `**Action:** ${action.toUpperCase()}\n**Affected Users:** ${membersToPunish.length}`,
            )
            .setTimestamp();

          logChannel.send({ embeds: [raidEmbed] });
        }
      }

      recentJoins.delete(guildId);
    }
  },
};
