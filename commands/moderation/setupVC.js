const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const TempVoiceSetup = require("../../models/TempVoice");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setup-vc")
        .setDescription("Sets up the temporary voice channel system.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply();

        const existingSetup = await TempVoiceSetup.findOne({ guildId: interaction.guild.id });

        if (existingSetup) {
            return interaction.editReply({
                content: "⚠️ Temp VC system is already set up. Use `/reset-temp-vc` to remove it first.",
                ephemeral: true
            });
        }

        try {
            // ✅ Step 1: Create Category
            const category = await interaction.guild.channels.create({
                name: "Temporary Voice Channels",
                type: ChannelType.GuildCategory
            });

            // ✅ Step 2: Create Interface Text Channel
            const interfaceChannel = await interaction.guild.channels.create({
                name: "hub",
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        allow: ["ViewChannel", "ReadMessageHistory"],
                        deny: ["SendMessages"]
                    }
                ]
            });

            const hubVoiceChannel = await interaction.guild.channels.create({
                name: "Join to Create",
                type: ChannelType.GuildVoice,
                parent: category.id
            });

            await TempVoiceSetup.create({
                guildId: interaction.guild.id,
                categoryId: category.id,
                interfaceChannelId: interfaceChannel.id,
                hubVoiceChannelId: hubVoiceChannel.id
            });

            await interaction.editReply({
                content: "✅ Temp VC System successfully set up!",
                ephemeral: true
            });

            await interfaceChannel.send({
                content: "**🎤 Temporary Voice Channel System**\n" +
                         "Join the **➕ Join to Create** voice channel to create your own private voice channel.\n\n" +
                         "**Auto-Deletion:** If the channel is empty, it will be removed after 10 seconds.",
            });

        } catch (error) {
            console.error("❌ Setup Error:", error);
            await interaction.editReply({
                content: "❌ Failed to set up Temp VC System. Check bot permissions and try again.",
                ephemeral: true
            });
        }
    }
};
