const Moderation = require("../models/Moderation");

async function isModerator(interaction) {
    try {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const moderationData = await Moderation.findOne({ guildId });

        if (!moderationData || !moderationData.moderators.has(userId)) {
            return false; // User is not a moderator
        }
        return true; // User is a moderator
    } catch (error) {
        console.error("Error checking moderator status:", error);
        return false; // Default to false if there's an error
    }
}

module.exports = { isModerator };
