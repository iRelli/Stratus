const { readdirSync } = require("fs");
const path = require("path");

module.exports = (client) => {
    const eventFiles = readdirSync(path.join(__dirname, "../events")).filter(file => file.endsWith(".js"));

    for (const file of eventFiles) {
        const event = require(`../events/${file}`);
        if (event.name && event.execute) {
            client.on(event.name, event.execute.bind(null, client));
            console.log(`✅ Loaded event: ${event.name}`);
        } else {
            console.warn(`⚠️ Skipping invalid event file: ${file}`);
        }
    }
};
