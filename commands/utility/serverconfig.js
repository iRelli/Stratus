const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
} = require('discord.js');
const Moderation = require('../../models/Moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription(
      'Displays and edits the moderation settings for this server.',
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('show')
        .setDescription('Displays the current moderation settings.'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('edit')
        .setDescription('Edits an individual moderation setting.')
        .addStringOption((option) =>
          option
            .setName('setting')
            .setDescription('The setting to edit.')
            .setRequired(true)
            .addChoices(
              { name: 'Moderation Log Channel', value: 'logChannelId' },
              { name: 'Warning Limit', value: 'warningLimit' },
              { name: 'Anti-Raid Protection', value: 'antiRaidEnabled' },
              { name: 'Anti-Raid Threshold', value: 'antiRaidThreshold' },
              { name: 'Anti-Raid Action', value: 'antiRaidAction' },
              { name: 'Rate Limit Protection', value: 'rateLimitEnabled' },
              { name: 'Rate Limit Threshold', value: 'rateLimitThreshold' },
              { name: 'Rate Limit Duration', value: 'rateLimitDuration' },
              { name: 'Message Filtering', value: 'messageFilterEnabled' },
              { name: 'Filter Level', value: 'filterLevel' },
              { name: 'Leveling System', value: 'levelingEnabled' },
              { name: 'XP Multiplier', value: 'xpMultiplier' },
            ),
        )
        .addStringOption((option) =>
          option
            .setName('value')
            .setDescription('The new value for the setting.')
            .setRequired(true),
        ),
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'show') {
      await interaction.deferReply();

      try {
        const guildId = interaction.guild.id;

        //  Ensure Default Configuration Exists
        let moderationData = await Moderation.findOne({ guildId });
        if (!moderationData) {
          await ensureGuildConfig(guildId);
          moderationData = await Moderation.findOne({ guildId });
        }

        //  Create Embed with Default Values if Necessary
        const embed = new EmbedBuilder()
          .setColor('#2F3136')
          .setTitle('⚙️ Server Configuration')
          .setDescription(
            'Here are the current moderation settings for this server:',
          )
          .addFields(
            {
              name: '📌 **Moderation Log Channel**',
              value: moderationData.logChannelId
                ? `<#${moderationData.logChannelId}>`
                : 'Not Set',
              inline: true,
            },
            {
              name: '⚠️ **Warning Limit**',
              value: `${moderationData.warningLimit ?? 5}`,
              inline: true,
            },
            {
              name: '🛑 **Anti-Raid Protection**',
              value: moderationData.antiRaidEnabled ? ' Enabled' : ' Disabled',
              inline: true,
            },
            {
              name: '👥 **Anti-Raid Threshold**',
              value: `${moderationData.antiRaidThreshold ?? 5} joins`,
              inline: true,
            },
            {
              name: '🔨 **Anti-Raid Action**',
              value: moderationData.antiRaidAction ?? 'kick',
              inline: true,
            },
            {
              name: '⏳ **Rate Limit Protection**',
              value: moderationData.rateLimitEnabled ? ' Enabled' : ' Disabled',
              inline: true,
            },
            {
              name: '💬 **Rate Limit Threshold**',
              value: `${moderationData.rateLimitThreshold ?? 5} messages`,
              inline: true,
            },
            {
              name: ' **Message Filtering**',
              value: moderationData.messageFilterEnabled
                ? ' Enabled'
                : ' Disabled',
              inline: true,
            },
            {
              name: '⚙️ **Filter Level**',
              value: moderationData.filterLevel ?? 'normal',
              inline: true,
            },
            {
              name: '📈 **Leveling System**',
              value: moderationData.levelingEnabled ? ' Enabled' : ' Disabled',
              inline: true,
            },
            {
              name: '⚡ **XP Multiplier**',
              value: `${moderationData.xpMultiplier ?? 1.0}`,
              inline: true,
            },
          )
          .setFooter({
            text: `Requested by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
          })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error(' Error fetching moderation settings:', error);
        return interaction.editReply({
          content:
            ' An error occurred while fetching the moderation settings. Try again later.',
        });
      }
    } else if (subcommand === 'edit') {
      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.Administrator,
        )
      ) {
        return interaction.reply({
          content: ' You do not have permission to use this command.',
          ephemeral: true,
        });
      }

      const setting = interaction.options.getString('setting');
      const value = interaction.options.getString('value');
      const guildId = interaction.guild.id;

      try {
        let moderationData = await Moderation.findOne({ guildId });

        if (!moderationData) {
          await ensureGuildConfig(guildId);
          moderationData = await Moderation.findOne({ guildId });
        }

        moderationData[setting] = value;
        await moderationData.save();

        return interaction.reply({
          content: ` The setting **${setting}** has been updated to **${value}**.`,
          ephemeral: true,
        });
      } catch (error) {
        console.error(' Error updating moderation settings:', error);
        return interaction.reply({
          content:
            ' An error occurred while updating the moderation settings. Try again later.',
          ephemeral: true,
        });
      }
    }
  },
};

//  Function to Ensure Default Moderation Schema Exists
async function ensureGuildConfig(guildId) {
  try {
    let moderationData = await Moderation.findOne({ guildId });

    if (!moderationData) {
      moderationData = new Moderation({
        guildId,
        logChannelId: null,
        warningLimit: 5,
        antiRaidEnabled: false,
        antiRaidThreshold: 5,
        antiRaidAction: 'kick',
        antiRaidTimeframe: 10,
        messageFilterEnabled: false,
        filterLevel: 'normal',
        levelingEnabled: false,
        xpMultiplier: 1.0,
      });

      await moderationData.save();
      console.log(` Created default moderation settings for guild: ${guildId}`);
    }
  } catch (error) {
    console.error(` Error ensuring moderation settings for ${guildId}:`, error);
  }
}
