require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { readdirSync } = require('fs');
const path = require('path');

const commands = [];
const commandFolders = readdirSync(path.join(__dirname, 'commands'));

for (const folder of commandFolders) {
  const commandFiles = readdirSync(
    path.join(__dirname, `commands/${folder}`),
  ).filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(`./commands/${folder}/${file}`);
    if (command.data) {
      commands.push(command.data.toJSON());
      console.log(`✅ Loaded command: ${command.data.name}`);
    }
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    if (!process.env.APP_ID) throw new Error("❌ Missing APP_ID in .env file.");
    if (!process.env.GUILD_ID) throw new Error("❌ Missing GUILD_ID in .env file.");

    console.log(`🚀 Refreshing ${commands.length} application (/) commands...`);

    const response = await rest.put(
      Routes.applicationGuildCommands(process.env.APP_ID, process.env.GUILD_ID),
      { body: commands },
    );

    console.log(`✅ Successfully reloaded ${commands.length} commands!`);
    console.log(`📜 Commands: ${commands.map(cmd => cmd.name).join(', ')}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating commands:', error);
    process.exit(1);
  }
})();
