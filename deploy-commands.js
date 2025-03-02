require("dotenv").config();
const { REST, Routes } = require("discord.js");
const { readdirSync } = require("fs");
const path = require("path");

const commands = [];
const commandFolders = readdirSync(path.join(__dirname, "commands"));

for (const folder of commandFolders) {
    const commandFiles = readdirSync(path.join(__dirname, `commands/${folder}`)).filter(file => file.endsWith(".js"));

    for (const file of commandFiles) {
        const command = require(`./commands/${folder}/${file}`);
        if (command.data) {
            commands.push(command.data.toJSON());
        }
    }
}

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log(`🚀 Refreshing ${commands.length} application (/) commands...`);
        await rest.put(Routes.applicationGuildCommands(process.env.APP_ID, process.env.GUILD_ID), { body: commands });
        console.log("✅ Successfully reloaded application (/) commands.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error loading commands:", error);
    }
})();
