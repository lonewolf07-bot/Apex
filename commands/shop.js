const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db.js');

module.exports = {
  commands: [
    // VIEW SHOP (.shop / .store)
    {
      data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('View roles available for purchase in the shop'),
      aliases: ['store', 'roleshop'],
      async executeSlash(interaction) {
        const roles = db.getShopRoles(interaction.guild.id);
        if (!roles || roles.length === 0) {
          return interaction.reply({ content: '🛒 The shop is currently empty! Staff can add roles using `/addshoprole`.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
          .setColor('#00FFB3')
          .setTitle(`🛒 ${interaction.guild.name} Role Shop`)
          .setTimestamp();

        let desc = '';
        for (const item of roles) {
          const role = interaction.guild.roles.cache.get(item.role_id);
          if (role) {
            desc += `${role} — **$${item.price.toLocaleString()}**\n`;
          }
        }

        embed.setDescription(desc || 'No valid roles found in the shop.');
        await interaction.reply({ embeds: [embed] });
      },
      async executePrefix(message) {
        const roles = db.getShopRoles(message.guild.id);
        if (!roles || roles.length === 0) {
          return message.reply('🛒 The shop is currently empty! Staff can add roles using `.addrole @Role <price>`.');
        }

        const embed = new EmbedBuilder()
          .setColor('#00FFB3')
          .setTitle(`🛒 ${message.guild.name} Role Shop`)
          .setTimestamp();

        let desc = '';
        for (const item of roles) {
          const role = message.guild.roles.cache.get(item.role_id);
          if (role) {
            desc += `${role} — **$${item.price.toLocaleString()}**\n`;
          }
        }

        embed.setDescription(desc || 'No valid roles found in the shop.');
        await message.reply({ embeds: [embed] });
      }
    },

    // BUY ROLE (.buy @Role)
    {
      data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Purchase a role from the server shop')
        .addRoleOption(opt => opt.setName('role').setDescription('The role you want to buy').setRequired(true)),
      aliases: ['buyrole'],
      async executeSlash(interaction) {
        const role = interaction.options.getRole('role');
        const shopItem = db.getShopRole(role.id);

        if (!shopItem || shopItem.guild_id !== interaction.guild.id) {
          return interaction.reply({ content: '❌ That role is not listed in the shop.', ephemeral: true });
        }

        if (interaction.member.roles.cache.has(role.id)) {
          return interaction.reply({ content: '❌ You already own this role!', ephemeral: true });
        }

        const user = db.getUser(interaction.user.id);
        if (user.wallet < shopItem.price) {
          return interaction.reply({ content: `❌ You need **$${shopItem.price}** in your wallet to buy ${role}, but you only have **$${user.wallet}**.`, ephemeral: true });
        }

        try {
          db.updateWallet(interaction.user.id, -shopItem.price);
          await interaction.member.roles.add(role);
          await interaction.reply({ content: `🎉 Congratulations! You bought ${role} for **$${shopItem.price}**!` });
        } catch (err) {
          console.error(err);
          db.updateWallet(interaction.user.id, shopItem.price);
          await interaction.reply({ content: '❌ Failed to assign the role. Please make sure the bot role is higher than the role being assigned in server settings!', ephemeral: true });
        }
      },
      async executePrefix(message, args) {
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);

        if (!role) {
          return message.reply('Usage: `.buy @Role`');
        }

        const shopItem = db.getShopRole(role.id);
        if (!shopItem || shopItem.guild_id !== message.guild.id) {
          return message.reply('❌ That role is not listed in the shop.');
        }

        if (message.member.roles.cache.has(role.id)) {
          return message.reply('❌ You already own this role!');
        }

        const user = db.getUser(message.author.id);
        if (user.wallet < shopItem.price) {
          return message.reply(`❌ You need **$${shopItem.price}** in your wallet to buy ${role}, but you only have **$${user.wallet}**.`);
        }

        try {
          db.updateWallet(message.author.id, -shopItem.price);
          await message.member.roles.add(role);
          await message.reply(`🎉 Congratulations! You bought ${role} for **$${shopItem.price}**!`);
        } catch (err) {
          console.error(err);
          db.updateWallet(message.author.id, shopItem.price);
          await message.reply('❌ Failed to assign the role. Make sure the bot role is positioned higher than the role being assigned in Role Hierarchy!');
        }
      }
    },

    // ADD ROLE TO SHOP (.addrole @Role <price> - MODS ONLY)
    {
      data: new SlashCommandBuilder()
        .setName('addshoprole')
        .setDescription('Add a role to the shop for members to buy (Staff only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addRoleOption(opt => opt.setName('role').setDescription('Role to put in the shop').setRequired(true))
        .addIntegerOption(opt => opt.setName('price').setDescription('Price in cash').setRequired(true)),
      aliases: ['addrole', 'shopadd'],
      async executeSlash(interaction) {
        const role = interaction.options.getRole('role');
        const price = interaction.options.getInteger('price');

        if (price <= 0) {
          return interaction.reply({ content: 'Price must be greater than 0.', ephemeral: true });
        }

        db.addShopRole(interaction.guild.id, role.id, price);
        await interaction.reply({ content: `✅ Successfully added ${role} to the shop for **$${price}**!` });
      },
      async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles) && !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          return message.reply('❌ You lack permissions to manage shop roles (`Manage Roles` required).');
        }

        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
        const price = parseInt(args[1]);

        if (!role || isNaN(price) || price <= 0) {
          return message.reply('Usage: `.addrole @Role <price>` or `.addshoprole @Role <price>`');
        }

        db.addShopRole(message.guild.id, role.id, price);
        await message.reply(`✅ Successfully added ${role} to the shop for **$${price}**!`);
      }
    },

    // DEL ROLE FROM SHOP (.delrole @Role - MODS ONLY)
    {
      data: new SlashCommandBuilder()
        .setName('delshoprole')
        .setDescription('Remove a role from the shop (Staff only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addRoleOption(opt => opt.setName('role').setDescription('Role to remove from shop').setRequired(true)),
      aliases: ['delrole', 'shopdel', 'remshoprole'],
      async executeSlash(interaction) {
        const role = interaction.options.getRole('role');
        const shopItem = db.getShopRole(role.id);

        if (!shopItem || shopItem.guild_id !== interaction.guild.id) {
          return interaction.reply({ content: '❌ That role is not in the shop.', ephemeral: true });
        }

        db.removeShopRole(interaction.guild.id, role.id);
        await interaction.reply({ content: `✅ Removed ${role} from the shop.` });
      },
      async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles) && !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          return message.reply('❌ You lack permissions to manage shop roles (`Manage Roles` required).');
        }

        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);

        if (!role) {
          return message.reply('Usage: `.delrole @Role` or `.delshoprole @Role`');
        }

        const shopItem = db.getShopRole(role.id);
        if (!shopItem || shopItem.guild_id !== message.guild.id) {
          return message.reply('❌ That role is not in the shop.');
        }

        db.removeShopRole(message.guild.id, role.id);
        await message.reply(`✅ Removed ${role} from the shop.`);
      }
    }
  ]
};