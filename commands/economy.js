const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db.js');

function formatCooldown(ms) {
  if (ms <= 0) return '✅ Ready';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return `⌛ ${parts.join(' ')}`;
}

module.exports = {
  commands: [
    // COOLDOWNS OVERVIEW (.cd / .cooldowns)
    {
      data: new SlashCommandBuilder()
        .setName('cooldowns')
        .setDescription('Check all active command cooldowns'),
      aliases: ['cd'],
      async executeSlash(interaction) {
        const user = db.getUser(interaction.user.id);
        const now = Date.now();

        const dailyTimer = formatCooldown(86400000 - (now - user.last_daily));
        const weeklyTimer = formatCooldown(604800000 - (now - user.last_weekly));
        const workTimer = formatCooldown(3600000 - (now - user.last_work));
        const crimeTimer = formatCooldown(7200000 - (now - user.last_crime));
        const robTimer = formatCooldown(7200000 - (now - user.last_rob));

        const embed = new EmbedBuilder()
          .setColor('#00FFB3')
          .setTitle(`⏳ ${interaction.user.username}'s Cooldowns`)
          .addFields(
            { name: 'Daily (`.d`)', value: dailyTimer, inline: true },
            { name: 'Weekly (`.w`)', value: weeklyTimer, inline: true },
            { name: 'Work (`.wrk`)', value: workTimer, inline: true },
            { name: 'Crime (`.c`)', value: crimeTimer, inline: true },
            { name: 'Rob (`.r`)', value: robTimer, inline: true }
          );
        await interaction.reply({ embeds: [embed] });
      },
      async executePrefix(message) {
        const user = db.getUser(message.author.id);
        const now = Date.now();

        const dailyTimer = formatCooldown(86400000 - (now - user.last_daily));
        const weeklyTimer = formatCooldown(604800000 - (now - user.last_weekly));
        const workTimer = formatCooldown(3600000 - (now - user.last_work));
        const crimeTimer = formatCooldown(7200000 - (now - user.last_crime));
        const robTimer = formatCooldown(7200000 - (now - user.last_rob));

        const embed = new EmbedBuilder()
          .setColor('#00FFB3')
          .setTitle(`⏳ ${message.author.username}'s Cooldowns`)
          .addFields(
            { name: 'Daily (`.d`)', value: dailyTimer, inline: true },
            { name: 'Weekly (`.w`)', value: weeklyTimer, inline: true },
            { name: 'Work (`.wrk`)', value: workTimer, inline: true },
            { name: 'Crime (`.c`)', value: crimeTimer, inline: true },
            { name: 'Rob (`.r`)', value: robTimer, inline: true }
          );
        await message.reply({ embeds: [embed] });
      }
    },

    // ROB MEMBER WALLET (.r / .rob / .steal)
    {
      data: new SlashCommandBuilder()
        .setName('rob')
        .setDescription('Attempt to steal money from a member\'s wallet')
        .addUserOption(opt => opt.setName('target').setDescription('User to rob').setRequired(true)),
      aliases: ['r', 'steal'],
      async executeSlash(interaction) {
        const robber = db.getUser(interaction.user.id);
        const targetUser = interaction.options.getUser('target');

        if (targetUser.id === interaction.user.id) {
          return interaction.reply({ content: "❌ You can't rob yourself!", ephemeral: true });
        }
        if (targetUser.bot) {
          return interaction.reply({ content: "❌ You can't rob bots!", ephemeral: true });
        }

        const victim = db.getUser(targetUser.id);
        const cooldown = 7200000;
        const elapsed = Date.now() - robber.last_rob;

        if (elapsed < cooldown) {
          return interaction.reply({ content: `🚨 Rob cooldown active! Check \`.cd\` for details.`, ephemeral: true });
        }
        if (robber.wallet < 100) {
          return interaction.reply({ content: "❌ You need at least **$100** in your wallet to cover court fines if caught!", ephemeral: true });
        }
        if (victim.wallet < 100) {
          return interaction.reply({ content: `❌ **${targetUser.username}** doesn't have enough cash in their wallet to be worth robbing (minimum $100).`, ephemeral: true });
        }

        db.setTimestamp(interaction.user.id, 'last_rob', Date.now());
        const success = Math.random() < 0.45;

        if (success) {
          const percentage = (Math.floor(Math.random() * 36) + 25) / 100;
          const stolen = Math.floor(victim.wallet * percentage);
          db.updateWallet(targetUser.id, -stolen);
          db.updateWallet(interaction.user.id, stolen);
          await interaction.reply(`🥷 Success! You snuck up on **${targetUser.username}** and stole **$${stolen}** from their wallet!`);
        } else {
          const fine = Math.min(Math.max(Math.floor(robber.wallet * 0.25), 100), 500);
          db.updateWallet(interaction.user.id, -fine);
          db.updateWallet(targetUser.id, fine);
          await interaction.reply(`🚔 Busted! You were caught attempting to rob **${targetUser.username}** and paid them **$${fine}** in legal fines!`);
        }
      },
      async executePrefix(message) {
        const robber = db.getUser(message.author.id);
        const targetUser = message.mentions.users.first();

        if (!targetUser) {
          return message.reply('Usage: `.r @User` or `.rob @User`');
        }
        if (targetUser.id === message.author.id) {
          return message.reply("❌ You can't rob yourself!");
        }
        if (targetUser.bot) {
          return message.reply("❌ You can't rob bots!");
        }

        const victim = db.getUser(targetUser.id);
        const cooldown = 7200000;
        const elapsed = Date.now() - robber.last_rob;

        if (elapsed < cooldown) {
          return message.reply(`🚨 Rob cooldown active! Check \`.cd\` for details.`);
        }
        if (robber.wallet < 100) {
          return message.reply("❌ You need at least **$100** in your wallet to cover court fines if caught!");
        }
        if (victim.wallet < 100) {
          return message.reply(`❌ **${targetUser.username}** doesn't have enough cash in their wallet to be worth robbing (minimum $100).`);
        }

        db.setTimestamp(message.author.id, 'last_rob', Date.now());
        const success = Math.random() < 0.45;

        if (success) {
          const percentage = (Math.floor(Math.random() * 36) + 25) / 100;
          const stolen = Math.floor(victim.wallet * percentage);
          db.updateWallet(targetUser.id, -stolen);
          db.updateWallet(message.author.id, stolen);
          await message.reply(`🥷 Success! You snuck up on **${targetUser.username}** and stole **$${stolen}** from their wallet!`);
        } else {
          const fine = Math.min(Math.max(Math.floor(robber.wallet * 0.25), 100), 500);
          db.updateWallet(message.author.id, -fine);
          db.updateWallet(targetUser.id, fine);
          await message.reply(`🚔 Busted! You were caught attempting to rob **${targetUser.username}** and paid them **$${fine}** in legal fines!`);
        }
      }
    },

    // BALANCE (.b / .bal)
    {
      data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check wallet and bank balance')
        .addUserOption(opt => opt.setName('target').setDescription('User to check')),
      aliases: ['b', 'bal'],
      async executeSlash(interaction) {
        const target = interaction.options.getUser('target') || interaction.user;
        const user = db.getUser(target.id);
        const embed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle(`💳 ${target.username}'s Balance`)
          .addFields(
            { name: 'Wallet', value: `$${user.wallet}`, inline: true },
            { name: 'Bank', value: `$${user.bank}`, inline: true },
            { name: 'Net Worth', value: `$${user.wallet + user.bank}`, inline: true }
          );
        await interaction.reply({ embeds: [embed] });
      },
      async executePrefix(message) {
        const target = message.mentions.users.first() || message.author;
        const user = db.getUser(target.id);
        const embed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle(`💳 ${target.username}'s Balance`)
          .addFields(
            { name: 'Wallet', value: `$${user.wallet}`, inline: true },
            { name: 'Bank', value: `$${user.bank}`, inline: true },
            { name: 'Net Worth', value: `$${user.wallet + user.bank}`, inline: true }
          );
        await message.reply({ embeds: [embed] });
      }
    },

    // DAILY (.d / .daily)
    {
      data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim daily cash reward ($500)'),
      aliases: ['d'],
      async executeSlash(interaction) {
        const user = db.getUser(interaction.user.id);
        const cooldown = 86400000;
        const elapsed = Date.now() - user.last_daily;

        if (elapsed < cooldown) {
          return interaction.reply({ content: `⌛ Cooldown active. Check \`.cd\` for full list.`, ephemeral: true });
        }
        db.updateWallet(interaction.user.id, 500);
        db.setTimestamp(interaction.user.id, 'last_daily', Date.now());
        await interaction.reply(`🎉 Claimed daily reward of **$500**!`);
      },
      async executePrefix(message) {
        const user = db.getUser(message.author.id);
        const cooldown = 86400000;
        const elapsed = Date.now() - user.last_daily;

        if (elapsed < cooldown) {
          return message.reply(`⌛ Cooldown active. Check \`.cd\` for full list.`);
        }
        db.updateWallet(message.author.id, 500);
        db.setTimestamp(message.author.id, 'last_daily', Date.now());
        await message.reply(`🎉 Claimed daily reward of **$500**!`);
      }
    },

    // WEEKLY (.w / .weekly)
    {
      data: new SlashCommandBuilder()
        .setName('weekly')
        .setDescription('Claim weekly cash reward ($3,500)'),
      aliases: ['w'],
      async executeSlash(interaction) {
        const user = db.getUser(interaction.user.id);
        const cooldown = 604800000;
        const elapsed = Date.now() - user.last_weekly;

        if (elapsed < cooldown) {
          return interaction.reply({ content: `⌛ Cooldown active. Check \`.cd\` for full list.`, ephemeral: true });
        }
        db.updateWallet(interaction.user.id, 3500);
        db.setTimestamp(interaction.user.id, 'last_weekly', Date.now());
        await interaction.reply(`🗓️ Claimed weekly reward of **$3,500**!`);
      },
      async executePrefix(message) {
        const user = db.getUser(message.author.id);
        const cooldown = 604800000;
        const elapsed = Date.now() - user.last_weekly;

        if (elapsed < cooldown) {
          return message.reply(`⌛ Cooldown active. Check \`.cd\` for full list.`);
        }
        db.updateWallet(message.author.id, 3500);
        db.setTimestamp(message.author.id, 'last_weekly', Date.now());
        await message.reply(`🗓️ Claimed weekly reward of **$3,500**!`);
      }
    },

    // WORK (.wrk / .work)
    {
      data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Work a shift to earn money'),
      aliases: ['wrk'],
      async executeSlash(interaction) {
        const user = db.getUser(interaction.user.id);
        const cooldown = 3600000;
        const elapsed = Date.now() - user.last_work;

        if (elapsed < cooldown) {
          return interaction.reply({ content: `⏳ Cooldown active. Check \`.cd\` for full list.`, ephemeral: true });
        }
        const earnings = Math.floor(Math.random() * 200) + 100;
        db.updateWallet(interaction.user.id, earnings);
        db.setTimestamp(interaction.user.id, 'last_work', Date.now());
        await interaction.reply(`💼 Shift finished! Earned **$${earnings}**.`);
      },
      async executePrefix(message) {
        const user = db.getUser(message.author.id);
        const cooldown = 3600000;
        const elapsed = Date.now() - user.last_work;

        if (elapsed < cooldown) {
          return message.reply(`⏳ Cooldown active. Check \`.cd\` for full list.`);
        }
        const earnings = Math.floor(Math.random() * 200) + 100;
        db.updateWallet(message.author.id, earnings);
        db.setTimestamp(message.author.id, 'last_work', Date.now());
        await message.reply(`💼 Shift finished! Earned **$${earnings}**.`);
      }
    },

    // DEPOSIT (.dep)
    {
      data: new SlashCommandBuilder()
        .setName('deposit')
        .setDescription('Deposit wallet cash into bank')
        .addStringOption(opt => opt.setName('amount').setDescription('Amount, all, half, or quarter').setRequired(true)),
      aliases: ['dep'],
      async executeSlash(interaction) {
        const user = db.getUser(interaction.user.id);
        const input = interaction.options.getString('amount').toLowerCase();
        let amount = input === 'all' ? user.wallet : (input === 'half' ? Math.floor(user.wallet / 2) : (input === 'quarter' ? Math.floor(user.wallet / 4) : parseInt(input)));

        if (isNaN(amount) || amount <= 0 || user.wallet < amount) {
          return interaction.reply({ content: 'Invalid or insufficient wallet amount.', ephemeral: true });
        }
        db.deposit(interaction.user.id, amount);
        await interaction.reply(`🏦 Deposited **$${amount}** into your bank.`);
      },
      async executePrefix(message, args) {
        const user = db.getUser(message.author.id);
        const input = args[0]?.toLowerCase();
        let amount = input === 'all' ? user.wallet : (input === 'half' ? Math.floor(user.wallet / 2) : (input === 'quarter' ? Math.floor(user.wallet / 4) : parseInt(input)));

        if (!input || isNaN(amount) || amount <= 0 || user.wallet < amount) {
          return message.reply('Usage: `.dep <amount|all|half|quarter>`');
        }
        db.deposit(message.author.id, amount);
        await message.reply(`🏦 Deposited **$${amount}** into your bank.`);
      }
    },

    // WITHDRAW (.with / .wd)
    {
      data: new SlashCommandBuilder()
        .setName('withdraw')
        .setDescription('Withdraw bank cash to wallet')
        .addStringOption(opt => opt.setName('amount').setDescription('Amount, all, half, or quarter').setRequired(true)),
      aliases: ['with', 'wd'],
      async executeSlash(interaction) {
        const user = db.getUser(interaction.user.id);
        const input = interaction.options.getString('amount').toLowerCase();
        let amount = input === 'all' ? user.bank : (input === 'half' ? Math.floor(user.bank / 2) : (input === 'quarter' ? Math.floor(user.bank / 4) : parseInt(input)));

        if (isNaN(amount) || amount <= 0 || user.bank < amount) {
          return interaction.reply({ content: 'Invalid or insufficient bank balance.', ephemeral: true });
        }
        db.withdraw(interaction.user.id, amount);
        await interaction.reply(`💵 Withdrew **$${amount}** from your bank.`);
      },
      async executePrefix(message, args) {
        const user = db.getUser(message.author.id);
        const input = args[0]?.toLowerCase();
        let amount = input === 'all' ? user.bank : (input === 'half' ? Math.floor(user.bank / 2) : (input === 'quarter' ? Math.floor(user.bank / 4) : parseInt(input)));

        if (!input || isNaN(amount) || amount <= 0 || user.bank < amount) {
          return message.reply('Usage: `.with <amount|all|half|quarter>`');
        }
        db.withdraw(message.author.id, amount);
        await message.reply(`💵 Withdrew **$${amount}** from your bank.`);
      }
    },

    // ECONOMY LEADERBOARD (.elb / .eleaderboard / .baltop)
    {
      data: new SlashCommandBuilder()
        .setName('eleaderboard')
        .setDescription('View the top server economy balances'),
      aliases: ['elb', 'baltop'],
      async executeSlash(interaction) {
        const top = db.getLeaderboard(10);
        if (!top.length) return interaction.reply('No economy data found.');

        let desc = top.map((u, i) => `**#${i + 1}** <@${u.user_id}> — **$${u.total.toLocaleString()}** *(Wallet: $${u.wallet.toLocaleString()} | Bank: $${u.bank.toLocaleString()})*`).join('\n');
        const embed = new EmbedBuilder()
          .setColor('#00E5FF')
          .setTitle('💰 Economy Leaderboard')
          .setDescription(desc);

        await interaction.reply({ embeds: [embed] });
      },
      async executePrefix(message) {
        const top = db.getLeaderboard(10);
        if (!top.length) return message.reply('No economy data found.');

        let desc = top.map((u, i) => `**#${i + 1}** <@${u.user_id}> — **$${u.total.toLocaleString()}** *(Wallet: $${u.wallet.toLocaleString()} | Bank: $${u.bank.toLocaleString()})*`).join('\n');
        const embed = new EmbedBuilder()
          .setColor('#00E5FF')
          .setTitle('💰 Economy Leaderboard')
          .setDescription(desc);

        await message.reply({ embeds: [embed] });
      }
    },

    // ADD MONEY (.am - MODS ONLY)
    {
      data: new SlashCommandBuilder()
        .setName('addmoney')
        .setDescription('Add money to a user\'s wallet (Staff only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
        .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to add').setRequired(true)),
      aliases: ['am'],
      async executeSlash(interaction) {
        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        if (amount <= 0) return interaction.reply({ content: 'Amount must be positive.', ephemeral: true });

        db.getUser(target.id);
        db.updateWallet(target.id, amount);
        await interaction.reply(`✅ Added **$${amount}** to **${target.username}**'s wallet.`);
      },
      async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild) && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return message.reply('❌ You lack permissions to use moderator commands.');
        }
        const target = message.mentions.users.first();
        const amount = parseInt(args[1]);
        if (!target || isNaN(amount) || amount <= 0) {
          return message.reply('Usage: `.am @User <amount>`');
        }

        db.getUser(target.id);
        db.updateWallet(target.id, amount);
        await message.reply(`✅ Added **$${amount}** to **${target.username}**'s wallet.`);
      }
    },

    // 🧹 RESET MONEY (.resetmoney - ADMINS ONLY)
    {
      data: new SlashCommandBuilder()
        .setName('resetmoney')
        .setDescription('Reset wallet & bank balance for a user or ALL members (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(opt => opt.setName('user').setDescription('Target user to reset').setRequired(false))
        .addBooleanOption(opt => opt.setName('all').setDescription('Reset money for ALL members').setRequired(false)),
      aliases: ['resetbal', 'reseteco', 'rmoney'],
      async executeSlash(interaction) {
        const target = interaction.options.getUser('user');
        const resetAll = interaction.options.getBoolean('all');

        if (!target && !resetAll) {
          return interaction.reply({ content: '❌ Choose a user to reset or set `all: true`.', ephemeral: true });
        }

        if (resetAll) {
          db.resetAll();
          return interaction.reply({ content: '🧹 Successfully reset economy balances for **ALL members** back to default ($100 wallet / $0 bank).' });
        }

        if (target) {
          db.getUser(target.id);
          db.resetUser(target.id);
          return interaction.reply({ content: `🧹 Successfully reset **${target.username}**'s balance back to default ($100 wallet / $0 bank).` });
        }
      },
      async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          return message.reply('❌ You lack permissions to use admin economy commands (`Manage Server` or `Administrator` required).');
        }

        const input = args[0]?.toLowerCase();

        if (input === 'all') {
          db.resetAll();
          return message.reply('🧹 Successfully reset economy balances for **ALL members** back to default ($100 wallet / $0 bank).');
        }

        const target = message.mentions.users.first();
        if (target) {
          db.getUser(target.id);
          db.resetUser(target.id);
          return message.reply(`🧹 Successfully reset **${target.username}**'s balance back to default ($100 wallet / $0 bank).`);
        }

        return message.reply('Usage:\n• Reset member: `.resetmoney @User`\n• Reset everyone: `.resetmoney all`');
      }
    }
  ]
};