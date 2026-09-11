const Database = require('better-sqlite3');
const db = new Database('apex_database.db');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS economy (
    user_id TEXT PRIMARY KEY,
    wallet INTEGER DEFAULT 100,
    bank INTEGER DEFAULT 0,
    daily_gain INTEGER DEFAULT 0,
    weekly_gain INTEGER DEFAULT 0,
    last_daily INTEGER DEFAULT 0,
    last_weekly INTEGER DEFAULT 0,
    last_work INTEGER DEFAULT 0,
    last_crime INTEGER DEFAULT 0,
    last_rob INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS levels (
    user_id TEXT PRIMARY KEY,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    last_xp_time INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS guild_config (
    guild_id TEXT PRIMARY KEY,
    level_channel_id TEXT,
    daily_top_role_id TEXT,
    weekly_top_role_id TEXT
  );

  CREATE TABLE IF NOT EXISTS xp_multipliers (
    role_id TEXT PRIMARY KEY,
    guild_id TEXT,
    multiplier REAL DEFAULT 1.0
  );

  CREATE TABLE IF NOT EXISTS afk (
    user_id TEXT PRIMARY KEY,
    reason TEXT,
    timestamp INTEGER,
    old_nickname TEXT
  );

  CREATE TABLE IF NOT EXISTS shop_roles (
    role_id TEXT PRIMARY KEY,
    guild_id TEXT,
    price INTEGER
  );
`);

// Auto-migrate missing columns
try { db.exec('ALTER TABLE economy ADD COLUMN daily_gain INTEGER DEFAULT 0;'); } catch (e) {}
try { db.exec('ALTER TABLE economy ADD COLUMN weekly_gain INTEGER DEFAULT 0;'); } catch (e) {}
try { db.exec('ALTER TABLE afk ADD COLUMN old_nickname TEXT;'); } catch (e) {}

module.exports = {
  // --- Economy Operations ---
  getUser: (userId) => {
    let user = db.prepare('SELECT * FROM economy WHERE user_id = ?').get(userId);
    if (!user) {
      db.prepare('INSERT INTO economy (user_id) VALUES (?)').run(userId);
      user = { user_id: userId, wallet: 100, bank: 0, daily_gain: 0, weekly_gain: 0, last_daily: 0, last_weekly: 0, last_work: 0, last_crime: 0, last_rob: 0 };
    }
    return user;
  },
  updateWallet: (userId, amount) => {
    db.prepare('UPDATE economy SET wallet = wallet + ?, daily_gain = daily_gain + ?, weekly_gain = weekly_gain + ? WHERE user_id = ?')
      .run(amount, amount > 0 ? amount : 0, amount > 0 ? amount : 0, userId);
  },
  updateBank: (userId, amount) => {
    db.prepare('UPDATE economy SET bank = bank + ? WHERE user_id = ?').run(amount, userId);
  },
  setTimestamp: (userId, field, time) => {
    db.prepare(`UPDATE economy SET ${field} = ? WHERE user_id = ?`).run(time, userId);
  },
  deposit: (userId, amount) => {
    db.prepare('UPDATE economy SET wallet = wallet - ?, bank = bank + ? WHERE user_id = ?').run(amount, amount, userId);
  },
  withdraw: (userId, amount) => {
    db.prepare('UPDATE economy SET bank = bank - ?, wallet = wallet + ? WHERE user_id = ?').run(amount, amount, userId);
  },
  resetUser: (userId) => {
    db.prepare('UPDATE economy SET wallet = 100, bank = 0, daily_gain = 0, weekly_gain = 0 WHERE user_id = ?').run(userId);
  },
  resetAll: () => {
    db.prepare('UPDATE economy SET wallet = 100, bank = 0, daily_gain = 0, weekly_gain = 0').run();
  },
  resetDatabase: () => {
    db.prepare('DELETE FROM economy').run();
    db.prepare('DELETE FROM levels').run();
    db.prepare('DELETE FROM afk').run();
    db.prepare('DELETE FROM shop_roles').run();
    db.prepare('DELETE FROM guild_config').run();
    db.prepare('DELETE FROM xp_multipliers').run();
  },
  getLeaderboard: (limit = 10) => {
    return db.prepare('SELECT user_id, wallet, bank, (wallet + bank) AS total FROM economy ORDER BY total DESC LIMIT ?').all(limit);
  },
  getDailyTop: (limit = 10) => db.prepare('SELECT user_id, daily_gain FROM economy ORDER BY daily_gain DESC LIMIT ?').all(limit),
  getWeeklyTop: (limit = 10) => db.prepare('SELECT user_id, weekly_gain FROM economy ORDER BY weekly_gain DESC LIMIT ?').all(limit),

  // --- Leveling Operations ---
  getUserLevel: (userId) => {
    let user = db.prepare('SELECT * FROM levels WHERE user_id = ?').get(userId);
    if (!user) {
      db.prepare('INSERT INTO levels (user_id) VALUES (?)').run(userId);
      user = { user_id: userId, xp: 0, level: 1, last_xp_time: 0 };
    }
    return user;
  },
  addXp: (userId, xpAmount) => {
    const user = module.exports.getUserLevel(userId);
    const newXp = user.xp + xpAmount;
    
    // Formula for required XP: Math.floor(100 * (level ** 1.5))
    let neededXp = Math.floor(100 * Math.pow(user.level, 1.5));
    let newLevel = user.level;
    let leveledUp = false;

    if (newXp >= neededXp) {
      newLevel += 1;
      leveledUp = true;
    }

    db.prepare('UPDATE levels SET xp = ?, level = ?, last_xp_time = ? WHERE user_id = ?')
      .run(newXp, newLevel, Date.now(), userId);

    return { leveledUp, newLevel, newXp };
  },
  getLevelLeaderboard: (limit = 10) => {
    return db.prepare('SELECT user_id, xp, level FROM levels ORDER BY level DESC, xp DESC LIMIT ?').all(limit);
  },

  // --- Configuration Operations ---
  getConfig: (guildId) => {
    let config = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId);
    if (!config) {
      db.prepare('INSERT INTO guild_config (guild_id) VALUES (?)').run(guildId);
      config = { guild_id: guildId, level_channel_id: null, daily_top_role_id: null, weekly_top_role_id: null };
    }
    return config;
  },
  setLevelChannel: (guildId, channelId) => {
    module.exports.getConfig(guildId);
    db.prepare('UPDATE guild_config SET level_channel_id = ? WHERE guild_id = ?').run(channelId, guildId);
  },
  setTopRoles: (guildId, dailyRoleId, weeklyRoleId) => {
    module.exports.getConfig(guildId);
    db.prepare('UPDATE guild_config SET daily_top_role_id = ?, weekly_top_role_id = ? WHERE guild_id = ?')
      .run(dailyRoleId, weeklyRoleId, guildId);
  },

  // --- XP Multipliers ---
  setRoleMultiplier: (guildId, roleId, multiplier) => {
    db.prepare('INSERT OR REPLACE INTO xp_multipliers (role_id, guild_id, multiplier) VALUES (?, ?, ?)')
      .run(roleId, guildId, multiplier);
  },
  getRoleMultipliers: (guildId) => {
    return db.prepare('SELECT * FROM xp_multipliers WHERE guild_id = ?').all(guildId);
  },

  // --- AFK Operations ---
  setAfk: (userId, reason, oldNickname = null) => {
    db.prepare('INSERT OR REPLACE INTO afk (user_id, reason, timestamp, old_nickname) VALUES (?, ?, ?, ?)').run(userId, reason, Date.now(), oldNickname);
  },
  getAfk: (userId) => db.prepare('SELECT * FROM afk WHERE user_id = ?').get(userId),
  removeAfk: (userId) => db.prepare('DELETE FROM afk WHERE user_id = ?').run(userId),

  // --- Shop Operations ---
  addShopRole: (guildId, roleId, price) => {
    db.prepare('INSERT OR REPLACE INTO shop_roles (role_id, guild_id, price) VALUES (?, ?, ?)').run(roleId, guildId, price);
  },
  removeShopRole: (guildId, roleId) => {
    db.prepare('DELETE FROM shop_roles WHERE guild_id = ? AND role_id = ?').run(roleId, guildId);
  },
  getShopRoles: (guildId) => db.prepare('SELECT * FROM shop_roles WHERE guild_id = ?').all(guildId),
  getShopRole: (roleId) => db.prepare('SELECT * FROM shop_roles WHERE role_id = ?').get(roleId)
};