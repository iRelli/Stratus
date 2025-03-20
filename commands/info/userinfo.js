const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Displays information about a user.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Select a user').setRequired(false),
    ),

  async execute(interaction) {
    try {
      const user = interaction.options.getUser('user') || interaction.user;
      const member = await interaction.guild.members.fetch(user.id);

      const embed = new EmbedBuilder()
        .setColor('#2F3136')
        .setTitle(`User Information - ${user.tag}`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 1024 }))
        .addFields(
          { name: '🆔 **User ID**', value: user.id, inline: true },
          { name: '📛 **Username**', value: user.tag, inline: true },
          {
            name: '📆 **Account Created**',
            value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`,
            inline: false,
          },
          {
            name: '📥 **Joined Server**',
            value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`,
            inline: false,
          },
          {
            name: '🎭 **Roles**',
            value:
              member.roles.cache.size > 1
                ? member.roles.cache.map((role) => role).join(', ')
                : 'None',
            inline: false,
          },
          {
            name: '🏆 **Highest Role**',
            value: member.roles.highest.name,
            inline: true,
          },
        )
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching user info:', error);
      return interaction.reply({
        content: ' An error occurred while fetching user information.',
        flags: 64,
      });
    }
  },
};
