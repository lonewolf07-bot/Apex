const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../db.js');

module.exports = {
  commands: [
    // RANK / LEVEL (.lvl / .level / .rank)
    {
      data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Check your current level and XP status')
        .addUserOption(opt => opt.setName('user').setDescription('Target user')),
      aliases: ['lvl', 'level'],
      async executeSlash(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        const lvlData = db.getUserLevel(target.id);
        const neededXp = Math.floor(100 * Math.pow(lvlData.level, 1.5));

        const embed = new EmbedBuilder()
          .setColor('#00FFB3')
          .setTitle(`📊 ${target.username}'s Level Status`)
          .setThumbnail(target.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: 'Level', value: `**${lvlData.level}**`, inline: true },
            { name: 'XP Progress', value: `**${lvlData.xp}** / ${neededXp} XP`, inline: true }
          );

        await interaction.reply({ embeds: [embed] });
      },
      async executePrefix(message) {
        const target = message.mentions.users.first() || message.author;
        const lvlData = db.getUserLevel(target.id);
        const neededXp = Math.floor(100 * Math.pow(lvlData.level, 1.5));

        const embed = new EmbedBuilder()
          .setColor('#00FFB3')
          .setTitle(`📊 ${target.username}'s Level Status`)
          .setThumbnail(target.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: 'Level', value: `**${lvlData.level}**`, inline: true },
            { name: 'XP Progress', value: `**${lvlData.xp}** / ${neededXp} XP`, inline: true }
          );

        await message.reply({ embeds: [embed] });
      }
    },

    // GENERAL / LEVEL LEADERBOARD (.leaderboard / .lb)
    {
      data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View server level & XP leaderboard'),
      aliases: ['lb', 'lblvl'],
      async executeSlash(interaction) {
        const top = db.getLevelLeaderboard(10);
        if (!top.length) return interaction.reply('No leveling data found.');

        let desc = top.map((u, i) => `**#${i + 1}** <@${u.user_id}> — Level **${u.level}** *(${u.xp} XP)*`).join('\n');
        const embed = new EmbedBuilder().setColor('#9B59B6').setTitle(`⭐ Apex Level Leaderboard`).setDescription(desc);

        await interaction.reply({ embeds: [embed] });
      },
      async executePrefix(message) {
        const top = db.getLevelLeaderboard(10);
        if (!top.length) return message.reply('No leveling data found.');

        let desc = top.map((u, i) => `**#${i + 1}** <@${u.user_id}> — Level **${u.level}** *(${u.xp} XP)*`).join('\n');
        const embed = new EmbedBuilder().setColor('#9B59B6').setTitle(`⭐ Apex Level Leaderboard`).setDescription(desc);

        await message.reply({ embeds: [embed] });
      }
    },

    // DAILY LEADERBOARD (.ltop)
    {
      data: new SlashCommandBuilder()
        .setName('ltop')
        .setDescription('View today\'s top earners'),
      aliases: ['topd', 'dailytop'],
      async executeSlash(interaction) {
        const top = db.getDailyTop(10);
        if (!top.length) return interaction.reply('No daily earnings recorded.');

        let desc = top.map((u, i) => `**#${i + 1}** <@${u.user_id}> — **+$${u.daily_gain}** earned today`).join('\n');
        const embed = new EmbedBuilder().setColor('#FFD700').setTitle(`☀️ Daily Economy Leaderboard`).setDescription(desc);

        await interaction.reply({ embeds: [embed] });
      },
      async executePrefix(message) {
        const top = db.getDailyTop(10);
        if (!top.length) return message.reply('No daily earnings recorded.');

        let desc = top.map((u, i) => `**#${i + 1}** <@${u.user_id}> — **+$${u.daily_gain}** earned today`).join('\n');
        const embed = new EmbedBuilder().setColor('#FFD700').setTitle(`☀️ Daily Economy Leaderboard`).setDescription(desc);

        await message.reply({ embeds: [embed] });
      }
    },

    // WEEKLY LEADERBOARD (.topw)
    {
      data: new SlashCommandBuilder()
        .setName('topw')
        .setDescription('View this week\'s top earners'),
      aliases: ['top w', 'weeklytop'],
      async executeSlash(interaction) {
        const top = db.getWeeklyTop(10);
        if (!top.length) return interaction.reply('No weekly earnings recorded.');

        let desc = top.map((u, i) => `**#${i + 1}** <@${u.user_id}> — **+$${u.weekly_gain}** earned this week`).join('\n');
        const embed = new EmbedBuilder().setColor('#3498DB').setTitle(`📅 Weekly Economy Leaderboard`).setDescription(desc);

        await interaction.reply({ embeds: [embed] });
      },
      async executePrefix(message) {
        const top = db.getWeeklyTop(10);
        if (!top.length) return message.reply('No weekly earnings recorded.');

        let desc = top.map((u, i) => `**#${i + 1}** <@${u.user_id}> — **+$${u.weekly_gain}** earned this week`).join('\n');
        const embed = new EmbedBuilder().setColor('#3498DB').setTitle(`📅 Weekly Economy Leaderboard`).setDescription(desc);

        await message.reply({ embeds: [embed] });
      }
    }
  ]
};