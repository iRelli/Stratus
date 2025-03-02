const { readdirSync } = require("fs");
const path = require("path");

module.exports = (client) => {
    client.commands = new Map();

    const commandFolders = readdirSync(path.join(__dirname, "../commands"));

    for (const folder of commandFolders) {
        const commandFiles = readdirSync(path.join(__dirname, `../commands/${folder}`)).filter(file => file.endsWith(".js"));

        for (const file of commandFiles) {
            const command = require(`../commands/${folder}/${file}`);
            if (command.data && command.execute) {
                client.commands.set(command.data.name, command);
                console.log(`✅ Loaded command: ${command.data.name}`);
            } else {
                console.warn(`⚠️ Skipping invalid command file: ${file}`);
            }
        }
    }
};
