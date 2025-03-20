const {
  PermissionsBitField,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const VoiceChannelCreate = require('../models/VoiceChannelCreate');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    console.log(
      `📥 Interaction received: ${interaction.commandName || interaction.customId}`,
    );

    if (interaction.isChatInputCommand()) {
      console.log(` Slash command detected: ${interaction.commandName}`);

      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) {
        return interaction.reply({
          content: ' Command not found.',
          ephemeral: true,
        });
      }

      try {
        await command.execute(interaction);
        console.log(` Successfully executed ${interaction.commandName}`);
      } catch (error) {
        console.error(` Error executing ${interaction.commandName}:`, error);
        await interaction.reply({
          content: ' An error occurred while executing this command.',
          ephemeral: true,
        });
      }
      return;
    }

    if (
      !interaction.isButton() &&
      !interaction.isStringSelectMenu() &&
      !interaction.isModalSubmit()
    ) {
      return;
    }

    const { customId, user, guild } = interaction;
    const member = interaction.member;
    const userVoiceChannel = member.voice.channel;
    const vcManageActions = [
      'lock',
      'unlock',
      'permit',
      'ban',
      'hide',
      'unhide',
      'limit',
      'invite',
    ];

    const player = client.manager.players.get(interaction.guild.id);
    if (!player)
      return interaction.reply({
        content: ' No music is playing.',
        ephemeral: true,
      });

    if (!userVoiceChannel) {
      return interaction.reply({
        content: ' You are not in any voice channel.',
        ephemeral: true,
      });
    }

    const vcData = await VoiceChannelCreate.findOne({
      guildId: guild.id,
      channelId: userVoiceChannel.id,
    });

    if (!vcData) {
      return interaction.reply({
        content: ' This voice channel is not registered.',
        ephemeral: true,
      });
    }

    if (
      interaction.message &&
      interaction.message.channel.id !== userVoiceChannel.id
    ) {
      return interaction.reply({
        content: ' You can only manage the voice channel you are currently in.',
        ephemeral: true,
      });
    }

    if (vcManageActions.includes(customId) && vcData.ownerId !== user.id) {
      return interaction.reply({
        content: '❌ Only the owner can manage this voice channel.',
        ephemeral: true,
      });
    }

    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      switch (customId) {
        case 'limit': {
          const modal = new ModalBuilder()
            .setCustomId('limitModal')
            .setTitle('Set Voice Channel Limit');

          const limitInput = new TextInputBuilder()
            .setCustomId('limitInput')
            .setLabel('Enter the max number of users:')
            .setPlaceholder('0 for unlimited (Max: 99)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          const actionRow = new ActionRowBuilder().addComponents(limitInput);
          modal.addComponents(actionRow);

          return interaction.showModal(modal);
        }
        case 'claim': {
          const originalOwner = await guild.members
            .fetch(vcData.ownerId)
            .catch(() => null);
          if (originalOwner && userVoiceChannel.members.has(originalOwner.id)) {
            return interaction.reply({
              content: ' The original owner is still in the voice channel.',
              ephemeral: true,
            });
          }

          try {
            await VoiceChannelCreate.findOneAndUpdate(
              { guildId: guild.id, channelId: userVoiceChannel.id },
              { ownerId: user.id },
            );

            const newChannelName = `${user.displayName}'s VC`;
            await userVoiceChannel.setName(newChannelName);

            return interaction.reply({
              content: ` You have successfully claimed ownership of this voice channel! It is now named **${newChannelName}**.`,
              ephemeral: true,
            });
          } catch (error) {
            console.error(' Error claiming voice channel:', error);
            return interaction.reply({
              content: ' Failed to claim the voice channel.',
              ephemeral: true,
            });
          }
        }
        case 'lock':
          if (
            !userVoiceChannel
              .permissionsFor(guild.roles.everyone)
              .has(PermissionsBitField.Flags.Connect)
          ) {
            return interaction.reply({
              content: ' Your voice channel is already locked.',
              ephemeral: true,
            });
          }
          await userVoiceChannel.permissionOverwrites.edit(
            guild.roles.everyone,
            { Connect: false },
          );
          return interaction.reply({
            content: ' Your voice channel is now locked.',
            ephemeral: true,
          });

        case 'unlock':
          if (
            userVoiceChannel
              .permissionsFor(guild.roles.everyone)
              .has(PermissionsBitField.Flags.Connect)
          ) {
            return interaction.reply({
              content: ' Your voice channel is already unlocked.',
              ephemeral: true,
            });
          }
          await userVoiceChannel.permissionOverwrites.edit(
            guild.roles.everyone,
            { Connect: true },
          );
          return interaction.reply({
            content: ' Your voice channel is now unlocked.',
            ephemeral: true,
          });

        case 'hide':
          if (
            !userVoiceChannel
              .permissionsFor(guild.roles.everyone)
              .has(PermissionsBitField.Flags.ViewChannel)
          ) {
            return interaction.reply({
              content: '🙈 Your voice channel is already hidden.',
              ephemeral: true,
            });
          }
          await userVoiceChannel.permissionOverwrites.edit(
            guild.roles.everyone,
            { ViewChannel: false },
          );
          return interaction.reply({
            content: '🙈 Your voice channel is now hidden.',
            ephemeral: true,
          });

        case 'unhide':
          if (
            userVoiceChannel
              .permissionsFor(guild.roles.everyone)
              .has(PermissionsBitField.Flags.ViewChannel)
          ) {
            return interaction.reply({
              content: '👁️ Your voice channel is already visible.',
              ephemeral: true,
            });
          }
          await userVoiceChannel.permissionOverwrites.edit(
            guild.roles.everyone,
            { ViewChannel: true },
          );
          return interaction.reply({
            content: '👁️ Your voice channel is now visible.',
            ephemeral: true,
          });

        case 'rename': {
          const modal = new ModalBuilder()
            .setCustomId('renameModal')
            .setTitle('Rename Your Voice Channel');

          const renameInput = new TextInputBuilder()
            .setCustomId('renameInput')
            .setLabel('Enter a new channel name:')
            .setPlaceholder('Example: "Chill Zone"')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          const actionRow = new ActionRowBuilder().addComponents(renameInput);
          modal.addComponents(actionRow);

          return interaction.showModal(modal);
        }
        case 'permit': {
          const restrictedMembers = guild.members.cache
            .filter(
              (m) =>
                !m.user.bot &&
                m.id !== user.id &&
                userVoiceChannel.permissionOverwrites
                  .resolve(m.id)
                  ?.deny.has(PermissionsBitField.Flags.Connect),
            )
            .map((m) => ({
              label: m.displayName,
              description: `@${m.user.username}`,
              value: m.id,
            }));

          if (restrictedMembers.length === 0) {
            return interaction.reply({
              content:
                ' No users are currently blocked from joining your voice channel.',
              ephemeral: true,
            });
          }

          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`permit_select_${userVoiceChannel.id}`)
            .setPlaceholder(' Select a user to permit...')
            .addOptions(restrictedMembers.slice(0, 25));

          const row = new ActionRowBuilder().addComponents(selectMenu);

          return interaction.reply({
            content: ' Select a user to allow into your voice channel:',
            components: [row],
            ephemeral: true,
          });
        }
        case `permit_select_${userVoiceChannel.id}`: {
          if (!interaction.isStringSelectMenu()) return;

          const selectedUserId = interaction.values[0];
          const selectedMember = await guild.members
            .fetch(selectedUserId)
            .catch(() => null);

          if (!selectedMember) {
            return interaction.reply({
              content: ' Selected user not found.',
              ephemeral: true,
            });
          }

          try {
            await userVoiceChannel.permissionOverwrites.edit(
              selectedMember.id,
              {
                Connect: null,
              },
            );

            return interaction.reply({
              content: ` **${selectedMember.displayName}** is now allowed to join your voice channel.`,
              ephemeral: true,
            });
          } catch (error) {
            console.error(' Error permitting user:', error);
            return interaction.reply({
              content: ' Failed to permit the user.',
              ephemeral: true,
            });
          }
        }
        case 'invite': {
          const members = guild.members.cache
            .filter((m) => !m.user.bot && m.id !== user.id)
            .map((m) => ({
              label: m.displayName,
              description: `@${m.user.username}`,
              value: m.id,
            }));

          if (members.length === 0) {
            return interaction.reply({
              content: ' No users available to invite.',
              ephemeral: true,
            });
          }

          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('invite_select')
            .setPlaceholder(' Select a user to invite...')
            .addOptions(members.slice(0, 25));

          const row = new ActionRowBuilder().addComponents(selectMenu);

          return interaction.reply({
            content: '📩 Select a user to send an invite:',
            components: [row],
            ephemeral: true,
          });
        }
        case 'ban': {
          const members = userVoiceChannel.members
            .filter((m) => !m.user.bot && m.id !== user.id)
            .map((m) => ({
              label: m.displayName,
              description: `@${m.user.username}`,
              value: m.id,
            }));

          if (members.length === 0) {
            return interaction.reply({
              content: ' No users available to ban.',
              ephemeral: true,
            });
          }

          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('ban_select')
            .setPlaceholder(' Select a user to ban...')
            .addOptions(members.slice(0, 25));

          const row = new ActionRowBuilder().addComponents(selectMenu);

          return interaction.reply({
            content: '⛔ Select a user to ban:',
            components: [row],
            ephemeral: true,
          });
        }
        case 'ban_select': {
          if (!interaction.isStringSelectMenu()) return;

          const selectedUserId = interaction.values[0];
          const selectedMember = await guild.members
            .fetch(selectedUserId)
            .catch(() => null);

          if (!selectedMember) {
            return interaction.reply({
              content: ' Selected user not found.',
              ephemeral: true,
            });
          }

          try {
            if (selectedMember.voice.channel) {
              await selectedMember.voice.disconnect();
            }

            await userVoiceChannel.permissionOverwrites.edit(
              selectedMember.id,
              {
                Connect: false,
              },
            );

            return interaction.reply({
              content: `⛔ **${selectedMember.displayName}** has been banned from your VC.`,
              ephemeral: true,
            });
          } catch (error) {
            console.error(' Error banning user:', error);
            return interaction.reply({
              content: ' Failed to ban the user from the VC.',
              ephemeral: true,
            });
          }
        }
        case 'transfer': {
          const membersInChannel = userVoiceChannel.members
            .filter((m) => !m.user.bot && m.id !== user.id)
            .map((m) => ({
              label: m.displayName,
              description: `@${m.user.username}`,
              value: m.id,
            }));

          if (membersInChannel.length === 0) {
            return interaction.reply({
              content: ' No eligible members available to transfer ownership.',
              ephemeral: true,
            });
          }

          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`transfer_select_${userVoiceChannel.id}`)
            .setPlaceholder(' Select a member to transfer ownership...')
            .addOptions(membersInChannel.slice(0, 25));

          const row = new ActionRowBuilder().addComponents(selectMenu);

          return interaction.reply({
            content:
              '👑 Select a member to transfer ownership of this voice channel:',
            components: [row],
            ephemeral: true,
          });
        }
        case `transfer_select_${userVoiceChannel.id}`: {
          if (!interaction.isStringSelectMenu()) return;

          const selectedUserId = interaction.values[0];
          const selectedMember = await guild.members
            .fetch(selectedUserId)
            .catch(() => null);

          if (!selectedMember) {
            return interaction.reply({
              content: ' Selected user not found.',
              ephemeral: true,
            });
          }

          if (!userVoiceChannel.members.has(selectedUserId)) {
            return interaction.reply({
              content: ' The selected user is no longer in your voice channel.',
              ephemeral: true,
            });
          }

          try {
            await VoiceChannelCreate.findOneAndUpdate(
              { guildId: guild.id, channelId: userVoiceChannel.id },
              { ownerId: selectedUserId },
            );

            const newChannelName = `${selectedMember.displayName}'s VC`;
            await userVoiceChannel.setName(newChannelName);

            return interaction.reply({
              content: ` Ownership has been transferred to **${selectedMember.displayName}**, and the voice channel has been renamed to **${newChannelName}**.`,
              ephemeral: true,
            });
          } catch (error) {
            console.error(' Error transferring ownership:', error);
            return interaction.reply({
              content: ' Failed to transfer ownership.',
              ephemeral: true,
            });
          }
        }
        case `skip`: {
          try {
            if (!player.queue.length)
              return interaction.reply({
                content: '❌ No more songs in the queue.',
                ephemeral: true,
              });
            player.stop();
            return interaction.reply({
              content: 'Skipped to next song.',
              ephemeral: true,
            });
          } catch (error) {
            console.log(error);
          }
        }
        case 'stop': {
          try {
            player.destroy();
            return interaction.reply({
              content: 'Music stopped.',
              ephemeral: true,
            });
          } catch (error) {
            console.log(error);
          }
        }
        case `pause`: {
          if (player.paused)
            return interaction.reply({
              content: '❌ Already paused.',
              ephemeral: true,
            });
          player.pause(true);
          return interaction.reply({
            content: 'Music paused.',
            ephemeral: true,
          });
        }
        case `resume`: {
          try {
            if (!player.paused)
              return interaction.reply({
                content: '❌ Already playing.',
                ephemeral: true,
              });
            player.pause(false);
            return interaction.reply({
              content: 'Music resumed.',
              ephemeral: true,
            });
          } catch (error) {
            console.log(error);
          }
        }
        case `stop`: {
          try {
            player.destroy();
            return interaction.reply({
              content: 'Music stopped.',
              ephemeral: true,
            });
          } catch (error) {
            console.log(error);
          }
        }
        default:
          return interaction.reply({
            content: ' Unknown button action.',
            ephemeral: true,
          });
      }
    }
    if (interaction.isModalSubmit() && interaction.customId === 'renameModal') {
      const newName = interaction.fields
        .getTextInputValue('renameInput')
        .trim();

      if (!newName || newName.length > 100) {
        return interaction.reply({
          content:
            ' Invalid name! Please enter a name between 1-100 characters.',
          ephemeral: true,
        });
      }

      try {
        if (!userVoiceChannel) {
          return interaction.reply({
            content: ' Your voice channel is no longer available.',
            ephemeral: true,
          });
        }

        if (
          !userVoiceChannel
            .permissionsFor(guild.members.me)
            .has(PermissionsBitField.Flags.ManageChannels)
        ) {
          return interaction.reply({
            content: ' I do not have permission to rename this channel.',
            ephemeral: true,
          });
        }

        await userVoiceChannel.setName(newName);

        return interaction.reply({
          content: ` Your voice channel has been renamed to **${newName}**.`,
          ephemeral: true,
        });
      } catch (error) {
        console.error(' Error renaming voice channel:', error);
        return interaction.reply({
          content: ' Failed to rename the voice channel.',
          ephemeral: true,
        });
      }
    }
    if (interaction.isModalSubmit() && interaction.customId === 'limitModal') {
      const limitValue = interaction.fields.getTextInputValue('limitInput');
      const limitNumber = parseInt(limitValue, 10);

      if (isNaN(limitNumber) || limitNumber < 0 || limitNumber > 99) {
        return interaction.reply({
          content: ' Please enter a valid number between 0 and 99.',
          ephemeral: true,
        });
      }

      await userVoiceChannel.setUserLimit(limitNumber);

      return interaction.reply({
        content: ` Voice channel limit set to **${limitNumber === 0 ? 'Unlimited' : limitNumber}** users.`,
        ephemeral: true,
      });
    }
  },
};
