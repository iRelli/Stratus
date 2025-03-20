const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const mongoose = require('mongoose');
const Moderation = require('../models/Moderation');
const Levels = require('discord-xp');
const AFK = require('../models/afkSchema');

const xpCooldowns = new Set();
module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (!message || !message.author) return;

    if (message.author.bot || !message.guild) return;

    const guildId = message.guild.id;
    const userId = message.author.id;
    const now = Date.now();
    let moderationData = await Moderation.findOne({ guildId });

    if (!moderationData) return;

    if (mongoose.connection.readyState !== 1) {
      console.error(' Mongoose is not connected. Skipping XP processing.');
      return;
    }

    if (moderationData.trustedUsers?.has(userId)) return;

    try {
      const afkStatus = await AFK.findOne({ userId });
      if (afkStatus) {
        await AFK.findOneAndDelete({ userId });
        await message.reply(
          `Welcome back <@${userId}>! Your AFK status has been removed.`,
        );
      }
    } catch (error) {
      console.error('Error removing AFK status on messageCreate:', error);
    }

    if (moderationData.messageFilterEnabled) {
      const FILTER_THRESHOLDS = { normal: 0.75, harsh: 0.6, extreme: 0.45 };
      const threshold = FILTER_THRESHOLDS[moderationData.filterLevel] || 0.75;

      try {
        const response = await axios.post(
          'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze',
          {
            comment: { text: message.content },
            languages: ['en'],
            requestedAttributes: {
              TOXICITY: {},
              SEVERE_TOXICITY: {},
              INSULT: {},
              PROFANITY: {},
              THREAT: {},
              IDENTITY_ATTACK: {},
            },
          },
          { params: { key: process.env.PERSPECTIVE_API_KEY } },
        );

        const scores = response.data.attributeScores;
        const isHateSpeech =
          scores.TOXICITY.summaryScore.value >= threshold ||
          scores.SEVERE_TOXICITY.summaryScore.value >= threshold ||
          scores.INSULT.summaryScore.value >= threshold ||
          scores.PROFANITY.summaryScore.value >= threshold ||
          scores.THREAT.summaryScore.value >= threshold ||
          scores.IDENTITY_ATTACK.summaryScore.value >= threshold;

        if (isHateSpeech) {
          await message.delete().catch(() => {});
          message.channel.send(
            `<@${userId}>, your message was removed due to inappropriate content.`,
          );

          const logChannel = message.guild.channels.cache.get(
            moderationData.logChannelId,
          );
          if (logChannel) {
            const embed = new EmbedBuilder()
              .setTitle('🚨 Message Filter Triggered')
              .setColor('Red')
              .addFields(
                { name: 'User', value: `<@${userId}>` },
                {
                  name: 'Filter Level',
                  value: moderationData.filterLevel.toUpperCase(),
                },
                { name: 'Channel', value: `<#${message.channel.id}>` },
                { name: 'Message Content', value: message.content },
              )
              .setTimestamp();
            logChannel.send({ embeds: [embed] });
          }
        }
      } catch (error) {
        console.error(`[Perspective API] Error: ${error}`);
      }
    }

    if (moderationData.levelingEnabled) {
      if (xpCooldowns.has(userId)) return;

      xpCooldowns.add(userId);
      setTimeout(() => xpCooldowns.delete(userId), 60000);
      const randomXP = Math.floor(Math.random() * 10) + 15;
      const hasLeveledUp = await Levels.appendXp(userId, guildId, randomXP);

      if (hasLeveledUp) {
        const userLevel = await Levels.fetch(userId, guildId, true);
        message.channel.send(
          `🎉 <@${userId}> has leveled up to **Level ${userLevel.level}!**`,
        );
      }
    }
  },
};
