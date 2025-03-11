require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Collection,
  Partials,
} = require('discord.js');
const loadCommands = require('./handlers/commandHandler');
const loadEvents = require('./handlers/eventHandler');
const deployCommands = require('./deploy-commands');


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.User, Partials.GuildMember, Partials.Channel],
});

client.cache = {
  servers: new Collection(),
  moderators: new Collection(),
  cacheTimestamps: new Collection(),
};

loadCommands(client);
loadEvents(client);
loadCommands();

global.client = client;

client.login(process.env.TOKEN);
