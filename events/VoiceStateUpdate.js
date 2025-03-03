const { Events, ChannelType, PermissionsBitField } = require("discord.js");
const TempVoice = require("../../models/TempVoice");
const TempVoiceSetup = require("../../models/TempVoiceSetup");

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const guild = newState.guild;
        const member = newState.member;

        // ✅ Fetch Setup Data
        const setup = await TempVoiceSetup.findOne({ guildId: guild.id });
        if (!setup) return;

        // ✅ Step 1: User Joins the Hub (Create a Temp Channel)
        if (newState.channelId === setup.hubVoiceChannelId) {
            // Check if user already has a temp VC
            const existingTemp = await TempVoice.findOne({ ownerId: member.id, guildId: guild.id });

            if (existingTemp) {
                await member.voice.setChannel(existingTemp.channelId).catch(() => {});
                return;
            }

            // ✅ Step 2: Create Temp Voice Channel
            const tempChannel = await guild.channels.create({
                name: `${member.user.username}'s VC`,
                type: ChannelType.GuildVoice,
                parent: setup.categoryId,
                permissionOverwrites: [
                    {
                        id: member.id,
                        allow: [
                            PermissionsBitField.Flags.ManageChannels,
                            PermissionsBitField.Flags.MoveMembers
                        ]
                    },
                    {
                        id: guild.id,
                        deny: [PermissionsBitField.Flags.ManageChannels]
                    }
                ]
            });

            // Move the user to their new temp channel
            await member.voice.setChannel(tempChannel.id).catch(() => {});

            // ✅ Save to Database
            await TempVoice.create({
                guildId: guild.id,
                ownerId: member.id,
                channelId: tempChannel.id
            });

            console.log(`Temp VC Created: ${tempChannel.name} for ${member.user.username}`);
        }

        // ✅ Step 3: Auto Delete Empty Temp Channels
        if (oldState.channel && oldState.channel.id !== setup.hubVoiceChannelId) {
            const tempData = await TempVoice.findOne({ channelId: oldState.channel.id });

            if (tempData && oldState.channel.members.size === 0) {
                setTimeout(async () => {
                    if (oldState.channel.members.size === 0) {
                        await oldState.channel.delete().catch(() => {});
                        await TempVoice.deleteOne({ channelId: oldState.channel.id });
                        console.log(`Temp VC Deleted: ${oldState.channel.name}`);
                    }
                }, 10000);
            }
        }
    }
};
