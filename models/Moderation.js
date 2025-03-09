const { Schema, model } = require('mongoose');

const MessageSchema = new Schema({
  userId: { type: String, required: true },
  messages: [
    {
      timestamp: { type: Number, required: true },
      content: { type: String, required: true },
    },
  ],
});

const ModerationSchema = new Schema({
  guildId: { type: String, required: true },
  warnings: { type: Map, of: Number, default: {} },
  bans: { type: [String], default: [] },
  logs: { type: [Object], default: [] },
  logChannelId: { type: String, default: null },
  warningLimit: { type: Number, default: 5 },

  antiRaidEnabled: { type: Boolean, default: false },
  antiRaidThreshold: { type: Number, default: 5 },
  antiRaidAction: { type: String, enum: ['kick', 'ban'], default: 'kick' },
  antiRaidTimeframe: { type: Number, default: 10 },

  trustedUsers: {
    type: Map,
    of: new Schema({
      addedBy: { type: String, required: true },
      timestamp: { type: Number, required: true },
    }),
    default: {},
  },

  moderators: {
    type: Map,
    of: new Schema({
      addedBy: { type: String, required: true },
      timestamp: { type: Number, required: true },
    }),
    default: {},
  },

  messageFilterEnabled: { type: Boolean, default: false },
  filterLevel: {
    type: String,
    enum: ['normal', 'harsh', 'extreme'],
    default: 'normal',
  },

  levelingEnabled: { type: Boolean, default: false },
  xpMultiplier: { type: Number, default: 1.0 },

  messages: { type: [MessageSchema], default: [] },
});

module.exports = model('Moderation', ModerationSchema);
