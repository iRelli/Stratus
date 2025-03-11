require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Collection,
  Partials,
} = require('discord.js');
const loadCommands = require('./handlers/commandHandler');
const loadEvents = require('./handlers/eventHandler');
const { deployCommands } = require('./deploy-commands');

const client = new Client({
  intents: Object.keys(GatewayIntentBits).map((a)=>{
    return GatewayIntentBits[a]
  }),
});

// Deploy commands and start the bot
(async () => {
  await deployCommands();
  client.login(process.env.TOKEN);
})();

client.cache = {
  servers: new Collection(),
  moderators: new Collection(),
  cacheTimestamps: new Collection(),
};

loadCommands(client);
loadEvents(client);

global.client = client;
