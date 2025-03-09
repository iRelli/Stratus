const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const mongoose = require('mongoose');
const Moderation = require('../models/Moderation');
const Levels = require('discord-xp');
const AFK = require('../models/afkSchema');

const userMessageCounts = new Map();
const rateLimitedUsers = new Map();
const xpCooldowns = new Set(); // ✅ Prevents XP farming by limiting messages per user

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (!message || !message.author || message.author.bot || !message.guild)
      return;

    const guildId = message.guild.id;
    const userId = message.author.id;
    let moderationData = await Moderation.findOne({ guildId });

    if (!moderationData) return;

    // ✅ Check if MongoDB is connected before querying
    if (mongoose.connection.readyState !== 1) {
      console.error('❌ Mongoose is not connected. Skipping XP processing.');
      return;
    }

    // ✅ Check if user is a Trusted User (bypass filtering)
    if (moderationData.trustedUsers.has(userId)) return;

    // ✅ Remove AFK status if the user sends a message
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

    // ✅ MESSAGE FILTERING SYSTEM
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

    // ✅ LEVELING SYSTEM (XP Gain with Cooldown)
    if (moderationData.levelingEnabled) {
      if (xpCooldowns.has(userId)) return; // Prevents spam abuse

      xpCooldowns.add(userId);
      setTimeout(() => xpCooldowns.delete(userId), 60000); // 1-minute cooldown

      const randomXP = Math.floor(Math.random() * 10) + 15; // XP range: 15-25
      const hasLeveledUp = await Levels.appendXp(userId, guildId, randomXP);

      if (hasLeveledUp) {
        const userLevel = await Levels.fetch(userId, guildId, true);
        message.channel.send(
          `🎉 <@${userId}> has leveled up to **Level ${userLevel.level}!**`,
        );
      }
    }

    const now = Date.now();

    // ✅ RATE LIMIT SYSTEM
    if (moderationData.rateLimitEnabled) {
      if (!userMessageCounts.has(userId)) {
        userMessageCounts.set(userId, []);
      }

      const timestamps = userMessageCounts.get(userId);
      while (
        timestamps.length > 0 &&
        now - timestamps[0] > moderationData.rateLimitTimeframe * 1000
      ) {
        timestamps.shift();
      }
      timestamps.push(now);

      if (timestamps.length >= moderationData.rateLimitThreshold) {
        const member = await message.guild.members.fetch(userId);
        if (!member.moderatable || rateLimitedUsers.has(userId)) return;

        try {
          await message.channel.permissionOverwrites.edit(userId, {
            SendMessages: false,
          });

          rateLimitedUsers.set(userId, true);
          setTimeout(async () => {
            await message.channel.permissionOverwrites.delete(userId);
            rateLimitedUsers.delete(userId);
          }, moderationData.rateLimitDuration * 1000);

          message.channel.send(
            `⚠️ <@${userId}> has been temporarily restricted due to excessive messaging.`,
          );

          if (moderationData.logChannelId) {
            const logChannel = message.guild.channels.cache.get(
              moderationData.logChannelId,
            );
            if (logChannel) {
              const rateLimitEmbed = new EmbedBuilder()
                .setColor('Orange')
                .setTitle('Rate-Limit Triggered')
                .addFields(
                  { name: 'User', value: `<@${userId}>`, inline: true },
                  {
                    name: 'Reason',
                    value: 'Excessive messaging',
                    inline: false,
                  },
                  {
                    name: 'Slowmode Duration',
                    value: `${moderationData.rateLimitDuration} seconds`,
                    inline: true,
                  },
                )
                .setTimestamp();

              logChannel.send({ embeds: [rateLimitEmbed] });
            }
          }
        } catch (error) {
          console.error(error);
        }

        userMessageCounts.delete(userId);
      }
    }
  },
};
