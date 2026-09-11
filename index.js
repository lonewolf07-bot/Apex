require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, EmbedBuilder, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');
const db = require('./db.js');

// 0. Keep-alive Web Server for Render
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Apex Bot is active and healthy!');
});

app.listen(PORT, () => {
  console.log(`[APEX] Web server running on port ${PORT}`);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.commands = new Collection();
client.aliases = new Collection();

// 1. Load Commands
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const commandModule = require(filePath);

    if (commandModule.commands && Array.isArray(commandModule.commands)) {
      for (const cmd of commandModule.commands) {
        if (cmd.data && cmd.data.name) {
          client.commands.set(cmd.data.name, cmd);
          if (cmd.aliases && Array.isArray(cmd.aliases)) {
            for (const alias of cmd.aliases) {
              client.aliases.set(alias, cmd.data.name);
            }
          }
        }
      }
    }
  }
}

// 2. XP Calculator with Multipliers
function calculateUserMultiplier(member) {
  let multiplier = 1.0;

  // Bonus +0.1x for every 10 roles
  const roleCount = member.roles.cache.size;
  multiplier += Math.floor(roleCount / 10) * 0.1;

  // Custom Admin Role Multipliers
  const customMultipliers = db.getRoleMultipliers(member.guild.id);
  for (const item of customMultipliers) {
    if (member.roles.cache.has(item.role_id)) {
      multiplier += (item.multiplier - 1.0);
    }
  }

  return Math.max(multiplier, 1.0);
}

// Helper: Handle Level Up Rewards & Notifications
async function processXpGain(member, amount, channel) {
  const multiplier = calculateUserMultiplier(member);
  const finalXp = Math.floor(amount * multiplier);

  const { leveledUp, newLevel } = db.addXp(member.id, finalXp);

  if (leveledUp) {
    // Reward Math: Base reward + Massive Level 10 Margin Boost
    let cashReward = newLevel * 150;
    if (newLevel % 10 === 0) {
      cashReward += newLevel * 2000; // Big bonus every 10 levels
    }

    db.updateWallet(member.id, cashReward);

    const config = db.getConfig(member.guild.id);
    const targetChannel = member.guild.channels.cache.get(config.level_channel_id) || channel;

    if (targetChannel) {
      const embed = new EmbedBuilder()
        .setColor('#FF007F')
        .setTitle('🎉 LEVEL UP!')
        .setDescription(`Congratulations ${member}! You reached **Level ${newLevel}**!`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '💰 Level Reward', value: `**+$${cashReward}** deposited to wallet!` }
        )
        .setFooter({ text: 'Apex Leveling System' });

      targetChannel.send({ embeds: [embed] }).catch(() => {});
    }
  }
}

// 3. Client Ready Event (Fixed event listener name)
client.once(Events.ClientReady, async (c) => {
  console.log(`[APEX v4.0] Logged in as ${c.user.tag}`);

  // Register Slash Commands
  const commandsToRegister = [];
  const registeredNames = new Set();
  for (const cmd of client.commands.values()) {
    if (cmd.data && !registeredNames.has(cmd.data.name)) {
      registeredNames.add(cmd.data.name);
      commandsToRegister.push(cmd.data.toJSON());
    }
  }

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    await rest.put(Routes.applicationCommands(c.user.id), { body: commandsToRegister });
    console.log('[APEX] Reloaded application (/) commands.');
  } catch (err) {
    console.error('[APEX] Slash command registration error:', err);
  }

  // VC XP Timer (Gives XP every 60s to active voice members)
  setInterval(() => {
    client.guilds.cache.forEach(guild => {
      guild.channels.cache.forEach(chan => {
        if (chan.isVoiceBased()) {
          chan.members.forEach(member => {
            if (!member.user.bot && !member.voice.deaf) {
              processXpGain(member, 15, chan);
            }
          });
        }
      });
    });
  }, 60000);

  // Leaderboard Top Roles Assign Loop (Every 10 Minutes)
  setInterval(async () => {
    client.guilds.cache.forEach(async guild => {
      const config = db.getConfig(guild.id);
      if (!config.daily_top_role_id && !config.weekly_top_role_id) return;

      const dailyTop = db.getDailyTop(1)[0];
      const weeklyTop = db.getWeeklyTop(1)[0];

      if (config.daily_top_role_id && dailyTop) {
        const role = guild.roles.cache.get(config.daily_top_role_id);
        if (role) {
          role.members.forEach(m => { if (m.id !== dailyTop.user_id) m.roles.remove(role).catch(() => {}); });
          const topMember = await guild.members.fetch(dailyTop.user_id).catch(() => null);
          if (topMember) topMember.roles.add(role).catch(() => {});
        }
      }

      if (config.weekly_top_role_id && weeklyTop) {
        const role = guild.roles.cache.get(config.weekly_top_role_id);
        if (role) {
          role.members.forEach(m => { if (m.id !== weeklyTop.user_id) m.roles.remove(role).catch(() => {}); });
          const topMember = await guild.members.fetch(weeklyTop.user_id).catch(() => null);
          if (topMember) topMember.roles.add(role).catch(() => {});
        }
      }
    });
  }, 600000);
});

// 4. Text Message Event
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;

  // AFK check & return logic
  const authorAfk = db.getAfk(message.author.id);
  if (authorAfk) {
    db.removeAfk(message.author.id);
    try { await message.member.setNickname(authorAfk.old_nickname || null); } catch (e) {}
    message.reply(`👋 Welcome back **${message.author.username}**, AFK status removed.`)
      .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
  }

  // AFK Mentions
  if (message.mentions.users.size > 0) {
    message.mentions.users.forEach(async (u) => {
      if (u.id === message.author.id) return;
      const targetAfk = db.getAfk(u.id);
      if (targetAfk) {
        message.reply(`🌙 **${u.username}** is AFK: **${targetAfk.reason}** (<t:${Math.floor(targetAfk.timestamp / 1000)}:R>)`);
      }
    });
  }

  // Text XP Processing (1 min cooldown per user)
  const userLvl = db.getUserLevel(message.author.id);
  if (Date.now() - userLvl.last_xp_time > 60000) {
    const xpEarned = Math.floor(Math.random() * 11) + 15; // 15-25 XP
    await processXpGain(message.member, xpEarned, message.channel);
  }

  // Prefix Execution
  const prefix = '.';
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  const cmdName = client.aliases.get(commandName) || commandName;
  const command = client.commands.get(cmdName);

  if (command && typeof command.executePrefix === 'function') {
    try {
      await command.executePrefix(message, args);
    } catch (error) {
      console.error(error);
      message.reply('An error occurred executing this command.');
    }
  }
});

// 5. Slash Command Handler
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command || typeof command.executeSlash !== 'function') return;

  try {
    await command.executeSlash(interaction);
  } catch (error) {
    console.error(error);
    const replyOptions = { content: 'Error executing slash command.', ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(replyOptions);
    else await interaction.reply(replyOptions);
  }
});

client.login(process.env.TOKEN).catch((err) => {
  console.error('[APEX] Login failed:', err);
});