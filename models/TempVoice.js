const { Schema, model } = require("mongoose");

const TempVoiceSetupSchema = new Schema({
    guildId: { type: String, required: true, unique: true },
    categoryId: { type: String, required: true },
    interfaceChannelId: { type: String, required: true },
    hubVoiceChannelId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = model("TempVoiceSetup", TempVoiceSetupSchema);
