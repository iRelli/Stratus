require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const loadCommands = require('./handlers/commandHandler');
const loadEvents = require('./handlers/eventHandler');
const { LavaShark } = require('lavashark');

const client = new Client({
  intents: Object.keys(GatewayIntentBits).map((a) => GatewayIntentBits[a]),
});

client.cache = {
  servers: new Collection(),
  moderators: new Collection(),
  cacheTimestamps: new Collection(),
};

loadCommands(client);
loadEvents(client);

client.login(process.env.TOKEN);
