const Moderation = require('../models/Moderation');

const CACHE_EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes

async function getCachedServerData(client, guildId) {
  if (!client.cache || !client.cache.servers || !client.cache.cacheTimestamps) {
    client.cache = { servers: new Map(), cacheTimestamps: new Map() };
  }

  const now = Date.now();
  let cachedData = client.cache.servers.get(guildId);
  let lastUpdated = client.cache.cacheTimestamps.get(guildId);

  if (!cachedData || !lastUpdated || now - lastUpdated > CACHE_EXPIRY_TIME) {
    const guild = await client.guilds.fetch(guildId);
    const owner = await guild.fetchOwner();
    const totalMembers = guild.memberCount;
    const rolesCount = guild.roles.cache.size;
    const emojisCount = guild.emojis.cache.size;
    const boostCount = guild.premiumSubscriptionCount || 0;
    const boostLevel = guild.premiumTier || 'None';
    const verificationLevel = guild.verificationLevel;
    const createdAt = `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`;

    const members = await guild.members.fetch();
    const online =
      members.filter((m) => m.presence?.status === 'online').size || 0;
    const idle = members.filter((m) => m.presence?.status === 'idle').size || 0;
    const dnd = members.filter((m) => m.presence?.status === 'dnd').size || 0;
    const offline = totalMembers - (online + idle + dnd);
    const bots = members.filter((m) => m.user.bot).size || 0;
    const mobile =
      members.filter((m) => m.presence?.clientStatus?.mobile).size || 0;

    cachedData = {
      ownerId: owner.id || 'Unknown',
      createdAt,
      totalMembers: totalMembers || 0,
      rolesCount: rolesCount || 0,
      emojisCount: emojisCount || 0,
      boostCount: boostCount || 0,
      boostLevel,
      verificationLevel,
      online,
      idle,
      dnd,
      offline,
      bots,
      mobile,
    };

    client.cache.servers.set(guildId, cachedData);
    client.cache.cacheTimestamps.set(guildId, now);
  }

  return cachedData;
}

function cleanExpiredCache(client) {
  if (!client.cache || !client.cache.servers) return;

  const now = Date.now();
  client.cache.servers.forEach((_, guildId) => {
    if (now - client.cache.cacheTimestamps.get(guildId) > CACHE_EXPIRY_TIME) {
      client.cache.servers.delete(guildId);
      client.cache.cacheTimestamps.delete(guildId);
    }
  });
}

setInterval(
  () => {
    cleanExpiredCache(global.client);
  },
  5 * 60 * 1000,
); // Runs every 5 minutes

module.exports = { getCachedServerData };
