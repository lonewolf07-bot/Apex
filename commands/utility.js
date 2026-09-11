const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../db.js');

module.exports = {
  commands: [
    // AFK (.a / .afk)
    {
      data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Set an AFK status message')
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for going AFK')),
      aliases: ['a'],
      async executeSlash(interaction) {
        const reason = interaction.options.getString('reason') || 'AFK';
        const member = interaction.member;
        const oldNickname = member.nickname || null;

        db.setAfk(interaction.user.id, reason, oldNickname);

        let nickChanged = true;
        const newNick = `[AFK] ${member.displayName}`.slice(0, 32);
        try {
          await member.setNickname(newNick);
        } catch (e) {
          nickChanged = false;
        }

        const responseMsg = nickChanged 
          ? `🌙 Your AFK status has been set: **${reason}** (Display name updated to **${newNick}**)`
          : `🌙 Your AFK status has been set: **${reason}** *(Note: Could not update nickname due to permissions)*`;

        await interaction.reply({ content: responseMsg });
      },
      async executePrefix(message, args) {
        const reason = args.join(' ') || 'AFK';
        const member = message.member;
        const oldNickname = member.nickname || null;

        db.setAfk(message.author.id, reason, oldNickname);

        let nickChanged = true;
        const newNick = `[AFK] ${member.displayName}`.slice(0, 32);
        try {
          await member.setNickname(newNick);
        } catch (e) {
          nickChanged = false;
        }

        const responseMsg = nickChanged 
          ? `🌙 Your AFK status has been set: **${reason}** (Display name updated to **${newNick}**)`
          : `🌙 Your AFK status has been set: **${reason}** *(Note: Could not update nickname due to permissions)*`;

        await message.reply(responseMsg);
      }
    },

    // DASHBOARD / HELP (.h / .help / .dashboard)
    {
      data: new SlashCommandBuilder()
        .setName('dashboard')
        .setDescription('View the Apex v4.0 interactive command guide'),
      aliases: ['h', 'help'],
      async executeSlash(interaction) {
        const embed = new EmbedBuilder()
          .setColor('#00E5FF')
          .setTitle('⚡ Apex v4.0 Command Dashboard')
          .setDescription('Supported bet inputs: `<amount>`, `all`, `half`, `quarter`')
          .addFields(
            { name: '💼 Economy & Cooldowns', value: '`.b` (balance)\n`.elb` (economy leaderboard)\n`.d` (daily)\n`.w` (weekly)\n`.wrk` (work)\n`.cd` (cooldown list)\n`.dep <amt|all>` (deposit)\n`.with <amt|all>` (withdraw)' },
            { name: '🎰 Gambling & Crime', value: '`.bj <amt>` (blackjack)\n`.rl <space> <amt>` (roulette)\n`.cf <h|t> <amt>` (coinflip)\n`.slot <amt>` (slots)\n`.c` (crime)\n`.r @User` (rob)' },
            { name: '📊 Leveling & Rankings', value: '`.rank [@User]` (check level & XP)\n`.leaderboard` / `.lb` (level ranking)\n`.ltop` (daily top earners)\n`.topw` (weekly top earners)' },
            { name: '🛒 Shop & Utility', value: '`.shop` (view role shop)\n`.buy @Role` (purchase role)\n`.a [reason]` (set AFK status)\n`.admindashboard` (Admin commands)' }
          )
          .setFooter({ text: 'Apex v4.0 - Multi-Module Engine' });

        await interaction.reply({ embeds: [embed] });
      },
      async executePrefix(message) {
        const embed = new EmbedBuilder()
          .setColor('#00E5FF')
          .setTitle('⚡ Apex v4.0 Command Dashboard')
          .setDescription('Supported bet inputs: `<amount>`, `all`, `half`, `quarter`')
          .addFields(
            { name: '💼 Economy & Cooldowns', value: '`.b` (balance)\n`.elb` (economy leaderboard)\n`.d` (daily)\n`.w` (weekly)\n`.wrk` (work)\n`.cd` (cooldown list)\n`.dep <amt|all>` (deposit)\n`.with <amt|all>` (withdraw)' },
            { name: '🎰 Gambling & Crime', value: '`.bj <amt>` (blackjack)\n`.rl <space> <amt>` (roulette)\n`.cf <h|t> <amt>` (coinflip)\n`.slot <amt>` (slots)\n`.c` (crime)\n`.r @User` (rob)' },
            { name: '📊 Leveling & Rankings', value: '`.rank [@User]` (check level & XP)\n`.leaderboard` / `.lb` (level ranking)\n`.ltop` (daily top earners)\n`.topw` (weekly top earners)' },
            { name: '🛒 Shop & Utility', value: '`.shop` (view role shop)\n`.buy @Role` (purchase role)\n`.a [reason]` (set AFK status)\n`.admindashboard` (Admin commands)' }
          )
          .setFooter({ text: 'Apex v4.0 - Multi-Module Engine' });

        await message.reply({ embeds: [embed] });
      }
    }
  ]
};