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
const lavalinkManager = require('./utils/LavaLink');
const interactionCreateHandler = require('./utils/interactionCreateHandler');

const client = new Client({
  intents: Object.keys(GatewayIntentBits).map((a) => GatewayIntentBits[a]),
});

client.cache = {
  servers: new Collection(),
  moderators: new Collection(),
  cacheTimestamps: new Collection(),
  djEnabled: new Collection(), 
};

(async () => {
  await deployCommands();
  client.login(process.env.TOKEN);
})();

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  lavalinkManager(client); 
});

client.on('interactionCreate', interaction => interactionCreateHandler(client, interaction));

loadCommands(client);
loadEvents(client);

global.client = client;