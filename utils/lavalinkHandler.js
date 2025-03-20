const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

module.exports = (client) => {
  console.log('✅ LavaShark event handler loaded');

  client.lavashark.on('nodeConnect', (node) => {
    console.log(`✅ Lavalink Node "${node.identifier}" connected successfully.`);
  });

  client.lavashark.on('error', (node, err) => {
    console.error('[LavaShark]', `Error on node ${node.identifier}`, err.message);
});

  client.lavashark.on('nodeDisconnect', (node) =>
    console.warn(`⚠️ Disconnected from Lavalink Node: ${node.identifier}`)
  );

  client.lavashark.on('trackStart', async (player, track) => {
    console.log(`🎵 Now Playing: ${track.title} - ${track.uri}`);

    try {
      const textChannel = client.channels.cache.get(player.textChannelId);
      if (!textChannel) return console.log('⚠️ Text channel not found for trackStart event');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('pause').setLabel('Pause').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('resume').setLabel('Resume').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('skip').setLabel('Skip').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('stop').setLabel('Stop').setStyle(ButtonStyle.Secondary)
      );

      const embed = new EmbedBuilder()
        .setTitle('Now Playing')
        .setDescription(` **${track.title}**`)
        .setThumbnail(track.thumbnail)
        .setColor('#1DB954');

      if (player.message) {
        await player.message.edit({ embeds: [embed], components: [row] });
      } else {
        const sentMessage = await textChannel.send({
          embeds: [embed],
          components: [row],
        });

        player.message = sentMessage;
      }
    } catch (error) {
      console.error('❌ Error in trackStart event:', error);
    }
  });

  client.lavashark.on('queueEnd', async (player) => {
    const textChannel = client.channels.cache.get(player.textChannelId);
    if (!textChannel) return console.log('⚠️ Text channel not found for queueEnd event');

    const embed = new EmbedBuilder()
      .setTitle('Queue Ended')
      .setDescription('🎶 The music queue has finished. Add more songs to keep the vibe going!')
      .setColor(0xff0000);

    await textChannel.send({ embeds: [embed] });
    player.destroy();
  });


};
