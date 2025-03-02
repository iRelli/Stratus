const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const { paginate } = require("@psibean/discord.js-pagination");
const fs = require("fs");
const path = require("path");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Displays all available commands with pagination and category selection."),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            // ✅ Load Command Categories
            const commandFolders = fs.readdirSync(path.join(__dirname, "../"));
            const categories = {};

            for (const folder of commandFolders) {
                const files = fs.readdirSync(path.join(__dirname, `../${folder}`)).filter(file => file.endsWith(".js"));
                categories[folder] = files.map(file => require(`../${folder}/${file}`).data);
            }

            if (Object.keys(categories).length === 0) {
                return interaction.editReply({ content: "⚠️ No commands found.", ephemeral: true });
            }

            // ✅ Create Dropdown Menu for Categories
            const categoryOptions = Object.keys(categories).map(cat => ({
                label: cat.charAt(0).toUpperCase() + cat.slice(1),
                value: cat
            }));

            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("category_select")
                    .setPlaceholder("Select a command category")
                    .addOptions(categoryOptions)
            );

            const embed = new EmbedBuilder()
                .setColor("#2F3136")
                .setTitle("📜 Stratus Help Menu")
                .setDescription("Use the dropdown menu below to select a command category.")
                .setTimestamp();

            const message = await interaction.editReply({ embeds: [embed], components: [menu] });

            const filter = i => i.user.id === interaction.user.id;
            const collector = message.createMessageComponentCollector({ filter, time: 60000 });

            collector.on("collect", async i => {
                if (!i.isStringSelectMenu() || !i.values.length) return;
                
                const category = i.values[0];
                if (!categories[category]) return i.reply({ content: "⚠️ Invalid category selected.", ephemeral: true });

                const commands = categories[category];
                const pages = commands.map(cmd => 
                    new EmbedBuilder()
                        .setColor("#2F3136")
                        .setTitle(`📜 ${category.charAt(0).toUpperCase() + category.slice(1)} Commands`)
                        .setDescription(`**/${cmd.name}** - ${cmd.description || "No description available"}`)
                        .setTimestamp()
                );

                // ✅ Start Pagination
                await paginate(i, pages, {
                    type: "buttons",
                    time: 60000,
                    ephemeral: false
                });
            });

        } catch (error) {
            console.error("❌ Error generating help menu:", error);
            return interaction.editReply({ content: "❌ An error occurred while generating the help menu. Try again later." });
        }
    }
};
