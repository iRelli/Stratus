const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('Music control commands.')
    .addSubcommand((sub) =>
      sub
        .setName('play')
        .setDescription('Plays a song from YouTube, Spotify, SoundCloud, etc.')
        .addStringOption((option) =>
          option
            .setName('query')
            .setDescription('Song name or URL')
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName('pause').setDescription('Pauses the current song.'),
    )
    .addSubcommand((sub) =>
      sub.setName('resume').setDescription('Resumes the paused song.'),
    )
    .addSubcommand((sub) =>
      sub.setName('skip').setDescription('Skips to the next track.'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('stop')
        .setDescription('Stops the music and clears the queue.'),
    )
    .addSubcommand((sub) =>
      sub.setName('queue').setDescription('Displays the current queue.'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('volume')
        .setDescription('Sets the volume.')
        .addIntegerOption((opt) =>
          opt
            .setName('amount')
            .setDescription('Volume (1-100)')
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('loop')
        .setDescription('Loops the current track or queue.')
        .addStringOption((opt) =>
          opt
            .setName('mode')
            .setDescription('Loop mode')
            .setRequired(true)
            .addChoices(
              { name: 'Track', value: 'track' },
              { name: 'Queue', value: 'queue' },
              { name: 'Off', value: 'off' },
            ),
        ),
    ),

  async execute(interaction) {
    const { client, guild, member, options } = interaction;
    const subcommand = options.getSubcommand();
    const query = options.getString('query');
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply({
        content: '❌ You must be in a voice channel to use this command.',
        ephemeral: true,
      });
    }

    // Check if Lavalink (LavaShark) is initialized
    if (!client.lavashark) {
      return interaction.reply({
        content: '❌ Lavalink is not initialized. Try restarting the bot.',
        ephemeral: true,
      });
    }

    // Ensure the player exists or create a new one
    let player = client.lavashark.getPlayer(guild.id);
    if (!player) {
      player = client.lavashark.createPlayer({
        guildId: guild.id,
        voiceChannelId: voiceChannel.id,
        textChannelId: interaction.channel.id,
        selfDeaf: true,
      });

      try {
        await player.connect(); // Ensure the bot connects to the voice channel
      } catch (error) {
        console.log(error);
        return interaction.reply({
          content: '❌ Failed to connect to the voice channel.',
          ephemeral: true,
        });
      }
    }

    switch (subcommand) {
      case 'play': {
        const res = await client.lavashark.search(query);

        if (res.loadType === 'error') {
          console.log(`Search Error: ${res.exception.message}`);
          return interaction.reply({ content: '❌ Could not find music.', ephemeral: true });
        } else if (res.loadType === 'empty') {
          console.log('Search Error: No matches found.');
          return interaction.reply({ content: '❌ No matches found.', ephemeral: true });
        }

        if (res.loadType === 'playlist') {
          player.addTracks(res.tracks);
          interaction.reply({ content: `✅ Loaded playlist **${res.playlistInfo.name}** with ${res.tracks.length} tracks.`, ephemeral: true });
        } else {
          const track = res.tracks[0];
          player.addTracks(track);
          interaction.reply({ content: `✅ Added **${track.title}** to the queue.`, ephemeral: true });
        }

        if (!player.playing) await player.play();
        break;
      }

      case 'pause':
        if (player.paused) {
          return interaction.reply({ content: '❌ The song is already paused.', ephemeral: true });
        }
        player.pause(true);
        return interaction.reply({ content: 'Music paused.' });

      case 'resume':
        if (!player.paused) {
          return interaction.reply({ content: '❌ The song is already playing.', ephemeral: true });
        }
        player.pause(false);
        return interaction.reply({ content: 'Music resumed.' });

      case 'skip':
        if (!player.queue.length) {
          return interaction.reply({ content: '❌ No more songs in the queue.', ephemeral: true });
        }
        player.stop();
        return interaction.reply({ content: 'Skipped to the next track.' });

      case 'stop':
        player.destroy();
        return interaction.reply({ content: 'Music stopped and queue cleared.' });

      case 'queue': {
        if (player.queue.size === 0) {
          return interaction.reply({ content: '❌ Queue is empty.', ephemeral: true });
        }
        
        const queueTracks = player.queue.tracks.slice(0, 10);
        let queueString = queueTracks
          .map((track, i) => {
            return `**${i + 1}.** [${track.title}](${track.uri})`;
          })
          .join('\n');
        
        const queueDuration = player.queue.duration;
        const minutes = Math.floor(queueDuration / 60000);
        const seconds = ((queueDuration % 60000) / 1000).toFixed(0);
        const formattedDuration = `${minutes}:${seconds.padStart(2, '0')}`;
        
        const embed = new EmbedBuilder()
          .setTitle('🎶 Current Queue')
          .setDescription(queueString || 'No songs in the queue.')
          .addField('Queue Duration', formattedDuration, true)
          .setColor('#1DB954')
          .setFooter({ text: `Total Songs: ${player.queue.size}` });
        
        return interaction.reply({ embeds: [embed] });
      }

      case 'volume': {
        const volume = options.getInteger('amount');
        if (volume < 1 || volume > 100) {
          return interaction.reply({ content: '❌ Volume must be between 1-100.', ephemeral: true });
        }
        player.setVolume(volume);
        return interaction.reply({ content: `Volume set to **${volume}**%.` });
      }

      case 'loop': {
        const mode = options.getString('mode');
        if (mode === 'track') {
          player.setTrackRepeat(true);
          player.setQueueRepeat(false);
          return interaction.reply({ content: 'Looping **current track**.' });
        } else if (mode === 'queue') {
          player.setQueueRepeat(true);
          player.setTrackRepeat(false);
          return interaction.reply({ content: 'Looping **entire queue**.' });
        } else {
          player.setTrackRepeat(false);
          player.setQueueRepeat(false);
          return interaction.reply({ content: 'Looping **disabled**.' });
        }
      }
    }
  },
};
