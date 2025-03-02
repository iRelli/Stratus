const { EmbedBuilder } = require("discord.js");
const Moderation = require("../models/Moderation");

module.exports = {
    name: "guildMemberRemove",
    async execute(client, member) {
        const guildId = member.guild.id;
        const moderationData = await Moderation.findOne({ guildId });

        if (!moderationData || !moderationData.logChannelId) return; // 

        const logChannel = member.guild.channels.cache.get(moderationData.logChannelId);
        if (!logChannel) return;

        const auditLogs = await member.guild.fetchAuditLogs({ type: 22, limit: 1 }); // Typ 22 means Ban
        const banLog = auditLogs.entries.first();

        if (banLog && banLog.target.id === member.id) {
            const banEmbed = new EmbedBuilder()
                .setColor("Black")
                .setTitle("🚨 User Banned")
                .addFields(
                    { name: "User", value: `<@${member.id}> (${member.user.tag})`, inline: true },
                    { name: "Moderator", value: `<@${banLog.executor.id}>`, inline: true },
                    { name: "Reason", value: banLog.reason || "No reason provided", inline: false }
                )
                .setTimestamp();

            logChannel.send({ embeds: [banEmbed] });

            moderationData.bans.push(member.id);
            moderationData.logs.push({
                action: "ban",
                userId: member.id,
                moderator: banLog.executor.id,
                reason: banLog.reason || "No reason provided",
                timestamp: new Date(),
            });
            await moderationData.save();
        }
    }
};
