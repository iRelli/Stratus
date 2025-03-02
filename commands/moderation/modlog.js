const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Moderation = require("../../models/Moderation");
const errorHandler = require("../../utils/errorHandler");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("modlog")
        .setDescription("View recent moderation actions.")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("Filter logs by a specific user.")
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName("action")
                .setDescription("Filter logs by action type.")
                .addChoices(
                    { name: "warn", value: "warn" },
                    { name: "ban", value: "ban" },
                    { name: "mute", value: "mute" },
                    { name: "kick", value: "kick" },
                    { name: "auto-mute", value: "auto-mute" }
                )
                .setRequired(false)
        )
        .setDefaultMemberPermissions(0),

    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            const user = interaction.options.getUser("user");
            const actionType = interaction.options.getString("action");

            let moderationData = await Moderation.findOne({ guildId });

            if (!moderationData || moderationData.logs.length === 0) {
                return interaction.reply({ content: "⚠️ No moderation logs found.", ephemeral: true });
            }

            let logs = moderationData.logs;
            if (user) logs = logs.filter(log => log.userId === user.id);
            if (actionType) logs = logs.filter(log => log.action === actionType);

            if (logs.length === 0) {
                return interaction.reply({ content: `⚠️ No logs found for the specified criteria.`, ephemeral: true });
            }

            logs = logs.slice(-10).reverse();

            const logEmbed = new EmbedBuilder()
                .setColor("Blue")
                .setTitle("📜 Moderation Logs")
                .setDescription(logs.map(log => 
                    `**Action:** ${log.action.toUpperCase()}\n**User:** <@${log.userId}>\n**Moderator:** <@${log.moderator}>\n**Reason:** ${log.reason || "No reason provided"}\n**Time:** <t:${Math.floor(new Date(log.timestamp).getTime() / 1000)}:R>`
                ).join("\n\n"))
                .setTimestamp();

            return interaction.reply({ embeds: [logEmbed], ephemeral: true });

        } catch (error) {
            return errorHandler(interaction, error);
        }
    }
};
