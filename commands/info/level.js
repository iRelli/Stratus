const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const Levels = require("discord-xp");
const canvacord = require("canvacord");
const path = require("path");
const fs = require('fs')

// ✅ Load default fonts for proper rendering
require('canvacord').Font.loadDefault();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("level")
        .setDescription("Displays your level card or another user's level.")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("The user whose level you want to check.")
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();
        try {
            const targetUser = interaction.options.getUser("user") || interaction.user; // ✅ Defaults to self
            const targetMember = await interaction.guild.members.fetch(targetUser.id); // ✅ Fetch full member data
            const guildId = interaction.guild?.id;

            if (!guildId) {
                return interaction.editReply({ content: "❌ This command must be used in a server." });
            }

            const userLevel = await Levels.fetch(targetUser.id, guildId, true);
            if (!userLevel) {
                return interaction.editReply({ content: `❌ ${targetUser.username} has no XP yet!` });
            }

            const xpRequired = Levels.xpFor(userLevel.level + 1);
            const currentXP = userLevel.xp;
            const progressPercentage = Math.min((currentXP / xpRequired) * 100, 100);

            const rawLeaderboard = await Levels.fetchLeaderboard(guildId, 10);
            const computedLeaderboard = await Levels.computeLeaderboard(interaction.client, rawLeaderboard, true);
            const userRankEntry = computedLeaderboard.find(entry => entry.userID === targetUser.id);
            const rank = userRankEntry ? userRankEntry.position : "N/A"; 
            const username = targetUser.username;
            const displayName = `${targetUser.globalName || targetUser.username}`;
            const status = targetMember.presence?.status || "offline"; 
            let backgroundPath = path.resolve(__dirname, "../../assets/Space.png"); 

            if (!fs.existsSync(backgroundPath)) {
                console.warn("⚠️ Background image not found. Using default color.");
                backgroundPath = "#23272a"; 
            }

            const rankCard = new canvacord.RankCardBuilder()
                .setAvatar(targetUser.displayAvatarURL({ format: "png", size: 256 }))
                .setCurrentXP(currentXP)
                .setRequiredXP(xpRequired)
                .setRank(rank)
                .setUsername(username)
                .setLevel(userLevel.level)
                .setDisplayName(displayName)
                .setStatus(status) 
                .setTextStyles({
                    level: "LEVEL :", 
                    xp: "XP :", 
                    rank: "RANK :", 
                })
                .setOverlay(50)
                .setBackground(backgroundPath) 
                .setProgressCalculator(() => progressPercentage);
                

            const rankImage = await rankCard.build();
            const attachment = new AttachmentBuilder(rankImage, { name: "level-card.png" });

            return interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error("❌ Error generating level card:", error);
            return interaction.editReply({ content: "❌ An error occurred while generating the level card. Try again later." });
        }
    }
};
