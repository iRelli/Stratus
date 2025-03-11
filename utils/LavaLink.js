const { Manager } = require('erela.js');

const lavalinkNodes = [{
  host: 'new-york-node-1.vortexcloud.xyz',
  port: 9027,
  password: 'youshallnotpass',
  secure: true, 
}];

module.exports = (client) => {
  client.manager = new Manager({
    nodes: lavalinkNodes,
    send(id, payload) {
      const guild = client.guilds.cache.get(id);
      if (guild) guild.shard.send(payload);
    },
  });

  client.manager.on('nodeConnect', (node) => {
    console.log(`Node ${node.options.identifier} connected.`);
  });

  client.manager.on('nodeError', (node, error) => {
    console.error(`Node ${node.options.identifier} had an error: ${error.message}`);
  });

  client.manager.on('trackStart', (player, track) => {
    const channel = client.channels.cache.get(player.textChannel);
    if (channel) channel.send(`Now playing: ${track.title}`);
  });

  client.manager.on('queueEnd', (player) => {
    const channel = client.channels.cache.get(player.textChannel);
    if (channel) channel.send('Queue has ended.');
    player.destroy();
  });
};