const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} = require('discord.js');
const db = require('../db.js');

// Helper function to parse standard bet amounts and shortcuts
function parseBet(input, wallet) {
  if (!input) return null;
  const clean = input.toLowerCase().trim();
  if (clean === 'all' || clean === 'max') return wallet;
  if (clean === 'half' || clean === '50%') return Math.floor(wallet / 2);
  if (clean === 'quarter' || clean === '25%') return Math.floor(wallet / 4);

  const parsed = parseInt(clean);
  if (isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

// Blackjack Helper Functions
const suits = ['♠️', '♥️', '♦️', '♣️'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function drawCard() {
  const value = values[Math.floor(Math.random() * values.length)];
  const suit = suits[Math.floor(Math.random() * suits.length)];
  return { value, suit };
}

function calculateHand(hand) {
  let total = 0;
  let aces = 0;

  for (const card of hand) {
    if (['J', 'Q', 'K'].includes(card.value)) {
      total += 10;
    } else if (card.value === 'A') {
      aces += 1;
      total += 11;
    } else {
      total += parseInt(card.value);
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return total;
}

function formatHand(hand) {
  return hand.map(c => `\`${c.value}${c.suit}\``).join(' ');
}

module.exports = {
  commands: [
    // 🃏 BLACKJACK (.bj / .blackjack)
    {
      data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Play a game of Blackjack against the dealer')
        .addStringOption(opt => opt.setName('amount').setDescription('Bet amount (number, all, half, quarter)').setRequired(true)),
      aliases: ['bj'],
      async executeSlash(interaction) {
        const user = db.getUser(interaction.user.id);
        const rawBet = interaction.options.getString('amount');
        const bet = parseBet(rawBet, user.wallet);

        if (!bet || bet <= 0 || user.wallet < bet) {
          return interaction.reply({ content: '❌ Invalid or insufficient wallet balance.', ephemeral: true });
        }

        await runBlackjack(interaction, interaction.user, bet, true);
      },
      async executePrefix(message, args) {
        const user = db.getUser(message.author.id);
        const bet = parseBet(args[0], user.wallet);

        if (!bet || bet <= 0 || user.wallet < bet) {
          return message.reply('Usage: `.bj <amount|all|half|quarter>`');
        }

        await runBlackjack(message, message.author, bet, false);
      }
    },

    // 🪙 COINFLIP (.cf / .coinflip)
    {
      data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flip a coin for cash')
        .addStringOption(opt => opt.setName('side').setDescription('heads or tails').setRequired(true))
        .addStringOption(opt => opt.setName('amount').setDescription('Bet amount (number, all, half, quarter)').setRequired(true)),
      aliases: ['cf'],
      async executeSlash(interaction) {
        const user = db.getUser(interaction.user.id);
        const sideInput = interaction.options.getString('side').toLowerCase();
        const rawBet = interaction.options.getString('amount');
        const bet = parseBet(rawBet, user.wallet);

        if (!['heads', 'head', 'h', 'tails', 'tail', 't'].includes(sideInput)) {
          return interaction.reply({ content: 'Choose `heads` or `tails`.', ephemeral: true });
        }
        if (!bet || bet <= 0 || user.wallet < bet) {
          return interaction.reply({ content: '❌ Invalid or insufficient wallet balance.', ephemeral: true });
        }

        const chosenSide = ['heads', 'head', 'h'].includes(sideInput) ? 'heads' : 'tails';
        const outcome = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = chosenSide === outcome;

        if (won) {
          db.updateWallet(interaction.user.id, bet);
          await interaction.reply(`🪙 The coin landed on **${outcome}**! You won **$${bet}**!`);
        } else {
          db.updateWallet(interaction.user.id, -bet);
          await interaction.reply(`🪙 The coin landed on **${outcome}**! You lost **$${bet}**.`);
        }
      },
      async executePrefix(message, args) {
        const user = db.getUser(message.author.id);
        const sideInput = args[0]?.toLowerCase();
        const rawBet = args[1];
        const bet = parseBet(rawBet, user.wallet);

        if (!sideInput || !['heads', 'head', 'h', 'tails', 'tail', 't'].includes(sideInput)) {
          return message.reply('Usage: `.cf <heads|tails> <amount|all|half|quarter>`');
        }
        if (!bet || bet <= 0 || user.wallet < bet) {
          return message.reply('❌ Invalid or insufficient wallet balance.');
        }

        const chosenSide = ['heads', 'head', 'h'].includes(sideInput) ? 'heads' : 'tails';
        const outcome = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = chosenSide === outcome;

        if (won) {
          db.updateWallet(message.author.id, bet);
          await message.reply(`🪙 The coin landed on **${outcome}**! You won **$${bet}**!`);
        } else {
          db.updateWallet(message.author.id, -bet);
          await message.reply(`🪙 The coin landed on **${outcome}**! You lost **$${bet}**.`);
        }
      }
    },

    // 🎰 SLOTS (.slot / .slots)
    {
      data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Play the slot machine')
        .addStringOption(opt => opt.setName('amount').setDescription('Bet amount (number, all, half, quarter)').setRequired(true)),
      aliases: ['slot'],
      async executeSlash(interaction) {
        const user = db.getUser(interaction.user.id);
        const rawBet = interaction.options.getString('amount');
        const bet = parseBet(rawBet, user.wallet);

        if (!bet || bet <= 0 || user.wallet < bet) {
          return interaction.reply({ content: '❌ Invalid or insufficient wallet balance.', ephemeral: true });
        }

        const items = ['🎰', '🍒', '🍋', '💎', '7️⃣'];
        const s1 = items[Math.floor(Math.random() * items.length)];
        const s2 = items[Math.floor(Math.random() * items.length)];
        const s3 = items[Math.floor(Math.random() * items.length)];

        const won = (s1 === s2 && s2 === s3);

        if (won) {
          const payout = bet * 3;
          db.updateWallet(interaction.user.id, payout);
          await interaction.reply(`🎰 [ ${s1} | ${s2} | ${s3} ]\n🎉 **JACKPOT!** All 3 matched! You won **$${payout}**!`);
        } else {
          db.updateWallet(interaction.user.id, -bet);
          await interaction.reply(`🎰 [ ${s1} | ${s2} | ${s3} ]\n❌ No 3-symbol match. You lost **$${bet}**.`);
        }
      },
      async executePrefix(message, args) {
        const user = db.getUser(message.author.id);
        const bet = parseBet(args[0], user.wallet);

        if (!bet || bet <= 0 || user.wallet < bet) {
          return message.reply('Usage: `.slot <amount|all|half|quarter>`');
        }

        const items = ['🎰', '🍒', '🍋', '💎', '7️⃣'];
        const s1 = items[Math.floor(Math.random() * items.length)];
        const s2 = items[Math.floor(Math.random() * items.length)];
        const s3 = items[Math.floor(Math.random() * items.length)];

        const won = (s1 === s2 && s2 === s3);

        if (won) {
          const payout = bet * 3;
          db.updateWallet(message.author.id, payout);
          await message.reply(`🎰 [ ${s1} | ${s2} | ${s3} ]\n🎉 **JACKPOT!** All 3 matched! You won **$${payout}**!`);
        } else {
          db.updateWallet(message.author.id, -bet);
          await message.reply(`🎰 [ ${s1} | ${s2} | ${s3} ]\n❌ No 3-symbol match. You lost **$${bet}**.`);
        }
      }
    },

    // 🎡 ROULETTE (.rl / .roulette)
    {
      data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Bet on red, black, green, or a specific number (0-36)')
        .addStringOption(opt => opt.setName('space').setDescription('red, black, green, or number 0-36').setRequired(true))
        .addStringOption(opt => opt.setName('amount').setDescription('Bet amount (number, all, half, quarter)').setRequired(true)),
      aliases: ['rl'],
      async executeSlash(interaction) {
        const user = db.getUser(interaction.user.id);
        const space = interaction.options.getString('space').toLowerCase();
        const rawBet = interaction.options.getString('amount');
        const bet = parseBet(rawBet, user.wallet);

        if (!bet || bet <= 0 || user.wallet < bet) {
          return interaction.reply({ content: '❌ Invalid or insufficient wallet balance.', ephemeral: true });
        }

        await handleRoulette(interaction, interaction.user, space, bet, true);
      },
      async executePrefix(message, args) {
        const user = db.getUser(message.author.id);
        const space = args[0]?.toLowerCase();
        const bet = parseBet(args[1], user.wallet);

        if (!space || !bet || bet <= 0 || user.wallet < bet) {
          return message.reply('Usage: `.rl <red|black|green|0-36> <amount|all|half|quarter>`');
        }

        await handleRoulette(message, message.author, space, bet, false);
      }
    },

    // 🚨 CRIME (.c / .crime)
    {
      data: new SlashCommandBuilder()
        .setName('crime')
        .setDescription('Attempt a high-risk crime for cash'),
      aliases: ['c'],
      async executeSlash(interaction) {
        const user = db.getUser(interaction.user.id);
        const cooldown = 7200000; // 2 hours
        const elapsed = Date.now() - user.last_crime;

        if (elapsed < cooldown) {
          return interaction.reply({ content: `🚨 Cooldown active. Check \`.cd\` for full list.`, ephemeral: true });
        }

        db.setTimestamp(interaction.user.id, 'last_crime', Date.now());
        if (Math.random() < 0.45) {
          const reward = Math.floor(Math.random() * 800) + 400;
          db.updateWallet(interaction.user.id, reward);
          await interaction.reply(`🥷 Success! You pulled off the heist and got **$${reward}**.`);
        } else {
          const fine = Math.floor(Math.random() * 300) + 150;
          db.updateWallet(interaction.user.id, -fine);
          await interaction.reply(`🚔 Busted! You were caught and fined **$${fine}**.`);
        }
      },
      async executePrefix(message) {
        const user = db.getUser(message.author.id);
        const cooldown = 7200000;
        const elapsed = Date.now() - user.last_crime;

        if (elapsed < cooldown) {
          return message.reply(`🚨 Cooldown active. Check \`.cd\` for full list.`);
        }

        db.setTimestamp(message.author.id, 'last_crime', Date.now());
        if (Math.random() < 0.45) {
          const reward = Math.floor(Math.random() * 800) + 400;
          db.updateWallet(message.author.id, reward);
          await message.reply(`🥷 Success! You pulled off the heist and got **$${reward}**.`);
        } else {
          const fine = Math.floor(Math.random() * 300) + 150;
          db.updateWallet(message.author.id, -fine);
          await message.reply(`🚔 Busted! You were caught and fined **$${fine}**.`);
        }
      }
    }
  ]
};

// ================= BLACKJACK CONTROLLER =================
async function runBlackjack(ctx, author, bet, isSlash) {
  const playerHand = [drawCard(), drawCard()];
  const dealerHand = [drawCard(), drawCard()];

  let playerTotal = calculateHand(playerHand);
  let dealerTotal = calculateHand(dealerHand);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('bj_hit').setLabel('Hit').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('bj_stand').setLabel('Stand').setStyle(ButtonStyle.Secondary)
  );

  const getEmbed = (inProgress = true, status = '') => {
    const embed = new EmbedBuilder()
      .setColor(inProgress ? '#5865F2' : (status.includes('won') ? '#57F287' : '#ED4245'))
      .setTitle(`🃏 Blackjack — Bet $${bet}`)
      .addFields(
        { name: `${author.username}'s Hand (${playerTotal})`, value: formatHand(playerHand) },
        { 
          name: `Dealer's Hand ${inProgress ? '' : `(${dealerTotal})`}`, 
          value: inProgress ? `\`${dealerHand[0].value}${dealerHand[0].suit}\` 🂠` : formatHand(dealerHand) 
        }
      );
    if (status) embed.setDescription(status);
    return embed;
  };

  const initialMsg = isSlash
    ? await ctx.reply({ embeds: [getEmbed()], components: [row], fetchReply: true })
    : await ctx.reply({ embeds: [getEmbed()], components: [row] });

  // Instant Blackjack check
  if (playerTotal === 21) {
    const payout = Math.floor(bet * 1.5);
    db.updateWallet(author.id, payout);
    return initialMsg.edit({ embeds: [getEmbed(false, `🎉 **Blackjack!** You won **$${payout}**!`) ], components: [] });
  }

  const collector = initialMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 30000
  });

  collector.on('collect', async (i) => {
    if (i.user.id !== author.id) {
      return i.reply({ content: '❌ This is not your blackjack game!', ephemeral: true });
    }

    if (i.customId === 'bj_hit') {
      playerHand.push(drawCard());
      playerTotal = calculateHand(playerHand);

      if (playerTotal > 21) {
        db.updateWallet(author.id, -bet);
        collector.stop('bust');
        return i.update({ embeds: [getEmbed(false, `💥 **Bust!** You went over 21 and lost **$${bet}**!`)], components: [] });
      }

      await i.update({ embeds: [getEmbed()], components: [row] });
    } else if (i.customId === 'bj_stand') {
      collector.stop('stand');

      // Dealer turn
      while (dealerTotal < 17) {
        dealerHand.push(drawCard());
        dealerTotal = calculateHand(dealerHand);
      }

      let statusMsg = '';
      if (dealerTotal > 21) {
        db.updateWallet(author.id, bet);
        statusMsg = `🎉 Dealer busted with ${dealerTotal}! You won **$${bet}**!`;
      } else if (playerTotal > dealerTotal) {
        db.updateWallet(author.id, bet);
        statusMsg = `🎉 You beat the dealer (${playerTotal} vs ${dealerTotal})! You won **$${bet}**!`;
      } else if (playerTotal < dealerTotal) {
        db.updateWallet(author.id, -bet);
        statusMsg = `❌ Dealer won (${dealerTotal} vs ${playerTotal}). You lost **$${bet}**.`;
      } else {
        statusMsg = `👔 **Tie / Push!** Your bet of **$${bet}** was returned.`;
      }

      await i.update({ embeds: [getEmbed(false, statusMsg)], components: [] });
    }
  });

  collector.on('end', (collected, reason) => {
    if (reason === 'time') {
      db.updateWallet(author.id, -bet);
      initialMsg.edit({ embeds: [getEmbed(false, `⏰ Game timed out. You forfeited **$${bet}**.`)], components: [] }).catch(() => {});
    }
  });
}

// ================= ROULETTE CONTROLLER =================
async function handleRoulette(ctx, author, space, bet, isSlash) {
  const redNumbers = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
  const blackNumbers = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];

  const landed = Math.floor(Math.random() * 37); // 0-36
  let landedColor = 'green';
  if (redNumbers.includes(landed)) landedColor = 'red';
  if (blackNumbers.includes(landed)) landedColor = 'black';

  let won = false;
  let multiplier = 0;

  const targetNum = parseInt(space);

  if (!isNaN(targetNum) && targetNum >= 0 && targetNum <= 36) {
    if (landed === targetNum) {
      won = true;
      multiplier = 35;
    }
  } else if (space === 'red' || space === 'r') {
    if (landedColor === 'red') { won = true; multiplier = 1; }
  } else if (space === 'black' || space === 'b') {
    if (landedColor === 'black') { won = true; multiplier = 1; }
  } else if (space === 'green' || space === 'g') {
    if (landedColor === 'green') { won = true; multiplier = 14; }
  } else {
    const errorText = 'Invalid space option! Choose `red`, `black`, `green`, or a number `0-36`.';
    return isSlash ? ctx.reply({ content: errorText, ephemeral: true }) : ctx.reply(errorText);
  }

  const colorEmoji = landedColor === 'red' ? '🔴' : (landedColor === 'black' ? '⚫' : '🟢');

  if (won) {
    const winAmount = bet * multiplier;
    db.updateWallet(author.id, winAmount);
    const msg = `🎡 The roulette wheel landed on ${colorEmoji} **${landed} (${landedColor.toUpperCase()})**!\n🎉 You won **$${winAmount}**!`;
    return isSlash ? ctx.reply(msg) : ctx.reply(msg);
  } else {
    db.updateWallet(author.id, -bet);
    const msg = `🎡 The roulette wheel landed on ${colorEmoji} **${landed} (${landedColor.toUpperCase()})**!\n❌ You lost **$${bet}**.`;
    return isSlash ? ctx.reply(msg) : ctx.reply(msg);
  }
}