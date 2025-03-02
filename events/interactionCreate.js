const mongoose = require('mongoose');

module.exports = {
    name: "interactionCreate",
    async execute(client, interaction) {
        if (!interaction.isCommand()) return;

        if (mongoose.connection.readyState !== 1) {
            return interaction.reply({ content: "❌ Database connection is not ready. Please try again later.", ephemeral: true });
        }


        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`❌ Error executing command: ${interaction.commandName}`, error);
            await interaction.reply({ content: "There was an error executing this command.", ephemeral: true });
        }
    }
};
