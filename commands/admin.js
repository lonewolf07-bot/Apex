const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db.js');

module.exports = {
  commands: [
    // ADMIN DASHBOARD (.admindashboard / .admindash)
    {
      data: new SlashCommandBuilder()
        .setName('admindashboard')
        .setDescription('View Admin & Staff Dashboard (Admins Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
      aliases: ['admindash', 'adb'],
      async executeSlash(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: '❌ Access Denied: Administrator permissions required.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
          .setColor('#FF0055')
          .setTitle('⚙️ Apex v4.0 Admin Control Panel')
          .setDescription('Administrative commands for server setup, leveling, and database control.')
          .addFields(
            { name: '⚙️ Server & Leveling Setup', value: '`.setlevelchannel #channel` (set level up log channel)\n`.settoproles @DailyRole @WeeklyRole` (set leaderboard auto-roles)\n`.setmultiplier @Role <multiplier>` (set custom XP multiplier)' },
            { name: '🛒 Shop Role Setup', value: '`.addrole @Role <price>` (add shop role)\n`.delrole @Role` (remove shop role)' },
            { name: '💰 Economy & Database Management', value: '`.am @User <amount>` (add money to wallet)\n`.resetmoney @User|all` (reset wallet & bank)\n`.resetdb confirm` (wipe entire database)' }
          )
          .setFooter({ text: 'Apex v4.0 - Administrator Privileges Active' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
      },
      async executePrefix(message) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return message.reply('❌ Access Denied: Administrator permissions required.');
        }

        const embed = new EmbedBuilder()
          .setColor('#FF0055')
          .setTitle('⚙️ Apex v4.0 Admin Control Panel')
          .setDescription('Administrative commands for server setup, leveling, and database control.')
          .addFields(
            { name: '⚙️ Server & Leveling Setup', value: '`.setlevelchannel #channel` (set level up log channel)\n`.settoproles @DailyRole @WeeklyRole` (set leaderboard auto-roles)\n`.setmultiplier @Role <multiplier>` (set custom XP multiplier)' },
            { name: '🛒 Shop Role Setup', value: '`.addrole @Role <price>` (add shop role)\n`.delrole @Role` (remove shop role)' },
            { name: '💰 Economy & Database Management', value: '`.am @User <amount>` (add money to wallet)\n`.resetmoney @User|all` (reset wallet & bank)\n`.resetdb confirm` (wipe entire database)' }
          )
          .setFooter({ text: 'Apex v4.0 - Administrator Privileges Active' });

        await message.reply({ embeds: [embed] });
      }
    },

    // SET LEVEL CHANNEL (.setlevelchannel)
    {
      data: new SlashCommandBuilder()
        .setName('setlevelchannel')
        .setDescription('Set the level up notification channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(opt => opt.setName('channel').setDescription('Target channel').setRequired(true)),
      aliases: ['setlvlchan'],
      async executeSlash(interaction) {
        const channel = interaction.options.getChannel('channel');
        db.setLevelChannel(interaction.guild.id, channel.id);
        await interaction.reply(`✅ Level-up notification channel set to ${channel}.`);
      },
      async executePrefix(message) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const channel = message.mentions.channels.first();
        if (!channel) return message.reply('Usage: `.setlevelchannel #channel`');

        db.setLevelChannel(message.guild.id, channel.id);
        await message.reply(`✅ Level-up notification channel set to ${channel}.`);
      }
    },

    // SET TOP LEADERBOARD ROLES (.settoproles)
    {
      data: new SlashCommandBuilder()
        .setName('settoproles')
        .setDescription('Set automatic roles for top daily and weekly members')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(opt => opt.setName('daily').setDescription('Daily Top Role').setRequired(true))
        .addRoleOption(opt => opt.setName('weekly').setDescription('Weekly Top Role').setRequired(true)),
      aliases: ['settoproles'],
      async executeSlash(interaction) {
        const dailyRole = interaction.options.getRole('daily');
        const weeklyRole = interaction.options.getRole('weekly');

        db.setTopRoles(interaction.guild.id, dailyRole.id, weeklyRole.id);
        await interaction.reply(`✅ Top roles updated:\n• **Daily:** ${dailyRole}\n• **Weekly:** ${weeklyRole}`);
      },
      async executePrefix(message) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const roles = message.mentions.roles.first(2);
        if (roles.length < 2) return message.reply('Usage: `.settoproles @DailyRole @WeeklyRole`');

        db.setTopRoles(message.guild.id, roles[0].id, roles[1].id);
        await message.reply(`✅ Top roles updated:\n• **Daily:** ${roles[0]}\n• **Weekly:** ${roles[1]}`);
      }
    },

    // SET XP MULTIPLIER ROLE (.setmultiplier)
    {
      data: new SlashCommandBuilder()
        .setName('setmultiplier')
        .setDescription('Set custom XP multiplier for a role')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(opt => opt.setName('role').setDescription('Target role').setRequired(true))
        .addNumberOption(opt => opt.setName('multiplier').setDescription('XP Multiplier (e.g. 1.5, 2.0)').setRequired(true)),
      aliases: ['setmulti', 'xpmulti'],
      async executeSlash(interaction) {
        const role = interaction.options.getRole('role');
        const mult = interaction.options.getNumber('multiplier');

        if (mult <= 0) return interaction.reply({ content: 'Multiplier must be greater than 0.', ephemeral: true });

        db.setRoleMultiplier(interaction.guild.id, role.id, mult);
        await interaction.reply(`⚡ Set **${role.name}** XP Multiplier to **${mult}x**.`);
      },
      async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const role = message.mentions.roles.first();
        const mult = parseFloat(args[1]);

        if (!role || isNaN(mult) || mult <= 0) {
          return message.reply('Usage: `.setmultiplier @Role <multiplier>` (e.g., `.setmultiplier @VIP 1.5`)');
        }

        db.setRoleMultiplier(message.guild.id, role.id, mult);
        await message.reply(`⚡ Set **${role.name}** XP Multiplier to **${mult}x**.`);
      }
    }
  ]
};