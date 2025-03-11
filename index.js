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
  intents: Object.keys(GatewayIntentBits).map((a) => GatewayIntentBits[a]),
});

client.cache = {
  servers: new Collection(),
  moderators: new Collection(),
  cacheTimestamps: new Collection(),
  djEnabled: new Collection(),
};

loadCommands(client);
loadEvents(client);

(async () => {
  await deployCommands();
  client.login(process.env.TOKEN);
})();

global.client = client;
