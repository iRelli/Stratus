const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const DjRole = require('../../models/djschema'); // Schema for DJ role management

module.exports = {
  data: new SlashCommandBuilder()
    .setName('djrole')
    .setDescription('Manage the DJ role for the server.')
    .addStringOption(option => 
      option.setName('rolename')
        .setDescription('The name of the DJ role')
        .setRequired(true)),

  async execute(interaction) {
    const guildId = interaction.guild.id;

    // Only allow users with manage roles permission to set the DJ role
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({ content: 'You do not have permission to set the DJ role.', ephemeral: true });
    }

    const roleName = interaction.options.getString('rolename');
    const role = interaction.guild.roles.cache.find(r => r.name === roleName);
    if (!role) {
      return interaction.reply({ content: `Role "${roleName}" not found. Please provide a valid role.`, ephemeral: true });
    }

    // Save DJ role in the database
    let djRoleData = await DjRole.findOne({ guildId });
    if (!djRoleData) {
      djRoleData = new DjRole({ guildId, roleId: role.id });
    } else {
      djRoleData.roleId = role.id;
    }

    await djRoleData.save();

    const embed = new EmbedBuilder()
      .setTitle('DJ Role Updated')
      .setDescription(`The DJ role has been set to: ${roleName}`)
      .setColor(0x1D82B6);

    return interaction.reply({ embeds: [embed] });
  },
};