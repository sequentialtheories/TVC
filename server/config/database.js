const mysql = require('mysql2/promise');
const { Pool } = require('pg');

const DB_TYPE = process.env.DB_TYPE || 'mysql';

let db;

if (DB_TYPE === 'postgresql') {
  db = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vault_club',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });
} else {
  db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vault_club',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

const dbOperations = {
  async getUserByEmail(email) {
    try {
      if (DB_TYPE === 'postgresql') {
        const result = await db.query(
          'SELECT * FROM users WHERE email = $1',
          [email]
        );
        return result.rows[0];
      } else {
        const [rows] = await db.execute(
          'SELECT * FROM users WHERE email = ?',
          [email]
        );
        return rows[0];
      }
    } catch (error) {
      console.error('Database error in getUserByEmail:', error);
      throw error;
    }
  },

  async getUserById(id) {
    try {
      if (DB_TYPE === 'postgresql') {
        const result = await db.query(
          'SELECT * FROM users WHERE id = $1',
          [id]
        );
        return result.rows[0];
      } else {
        const [rows] = await db.execute(
          'SELECT * FROM users WHERE id = ?',
          [id]
        );
        return rows[0];
      }
    } catch (error) {
      console.error('Database error in getUserById:', error);
      throw error;
    }
  },

  async createUser({ email, passwordHash, walletAddress, stUserId, rigorLevel, penalties }) {
    try {
      if (DB_TYPE === 'postgresql') {
        const result = await db.query(
          'INSERT INTO users (email, password_hash, wallet_address, st_user_id, rigor_level, penalties, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id',
          [email, passwordHash, walletAddress, stUserId, rigorLevel || 0, penalties || 0]
        );
        return result.rows[0].id;
      } else {
        const [result] = await db.execute(
          'INSERT INTO users (email, password_hash, wallet_address, st_user_id, rigor_level, penalties, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
          [email, passwordHash, walletAddress, stUserId, rigorLevel || 0, penalties || 0]
        );
        return result.insertId;
      }
    } catch (error) {
      console.error('Database error in createUser:', error);
      throw error;
    }
  },

  async updateUser(id, updates) {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          if (DB_TYPE === 'postgresql') {
            fields.push(`${key} = $${paramIndex}`);
          } else {
            fields.push(`${key} = ?`);
          }
          values.push(updates[key]);
          paramIndex++;
        }
      });

      if (fields.length === 0) return;

      if (DB_TYPE === 'postgresql') {
        fields.push(`updated_at = NOW()`);
        values.push(id);
        await db.query(
          `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
          values
        );
      } else {
        fields.push('updated_at = NOW()');
        values.push(id);
        await db.execute(
          `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
          values
        );
      }
    } catch (error) {
      console.error('Database error in updateUser:', error);
      throw error;
    }
  },

  async getUserWallets(userId) {
    try {
      if (DB_TYPE === 'postgresql') {
        const result = await db.query(
          'SELECT * FROM user_wallets WHERE user_id = $1 ORDER BY created_at DESC',
          [userId]
        );
        return result.rows;
      } else {
        const [rows] = await db.execute(
          'SELECT * FROM user_wallets WHERE user_id = ? ORDER BY created_at DESC',
          [userId]
        );
        return rows;
      }
    } catch (error) {
      console.error('Database error in getUserWallets:', error);
      throw error;
    }
  },

  async getWalletByAddress(address) {
    try {
      if (DB_TYPE === 'postgresql') {
        const result = await db.query(
          'SELECT * FROM user_wallets WHERE address = $1',
          [address]
        );
        return result.rows[0];
      } else {
        const [rows] = await db.execute(
          'SELECT * FROM user_wallets WHERE address = ?',
          [address]
        );
        return rows[0];
      }
    } catch (error) {
      console.error('Database error in getWalletByAddress:', error);
      throw error;
    }
  },

  async getWalletById(id) {
    try {
      if (DB_TYPE === 'postgresql') {
        const result = await db.query(
          'SELECT * FROM user_wallets WHERE id = $1',
          [id]
        );
        return result.rows[0];
      } else {
        const [rows] = await db.execute(
          'SELECT * FROM user_wallets WHERE id = ?',
          [id]
        );
        return rows[0];
      }
    } catch (error) {
      console.error('Database error in getWalletById:', error);
      throw error;
    }
  },

  async linkWallet({ userId, address, network }) {
    try {
      if (DB_TYPE === 'postgresql') {
        const result = await db.query(
          'INSERT INTO user_wallets (user_id, address, network, is_active, created_at) VALUES ($1, $2, $3, true, NOW()) RETURNING id',
          [userId, address, network]
        );
        return result.rows[0].id;
      } else {
        const [result] = await db.execute(
          'INSERT INTO user_wallets (user_id, address, network, is_active, created_at) VALUES (?, ?, ?, true, NOW())',
          [userId, address, network]
        );
        return result.insertId;
      }
    } catch (error) {
      console.error('Database error in linkWallet:', error);
      throw error;
    }
  },

  async unlinkWallet(id) {
    try {
      if (DB_TYPE === 'postgresql') {
        await db.query(
          'DELETE FROM user_wallets WHERE id = $1',
          [id]
        );
      } else {
        await db.execute(
          'DELETE FROM user_wallets WHERE id = ?',
          [id]
        );
      }
    } catch (error) {
      console.error('Database error in unlinkWallet:', error);
      throw error;
    }
  },

  async createSubClub(subClubData) {
    try {
      if (DB_TYPE === 'postgresql') {
        const result = await db.query(
          'INSERT INTO subclubs (address, creator_id, rigor_level, lock_period, is_charged) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [subClubData.address, subClubData.creator_id, subClubData.rigor_level, subClubData.lock_period, subClubData.is_charged]
        );
        return result.rows[0];
      } else {
        const [result] = await db.execute(
          'INSERT INTO subclubs (address, creator_id, rigor_level, lock_period, is_charged) VALUES (?, ?, ?, ?, ?)',
          [subClubData.address, subClubData.creator_id, subClubData.rigor_level, subClubData.lock_period, subClubData.is_charged]
        );
        return { id: result.insertId, ...subClubData };
      }
    } catch (error) {
      console.error('Database error in createSubClub:', error);
      throw error;
    }
  },

  async getSubClubByAddress(address) {
    try {
      if (DB_TYPE === 'postgresql') {
        const result = await db.query('SELECT * FROM subclubs WHERE address = $1', [address]);
        return result.rows[0];
      } else {
        const [rows] = await db.execute('SELECT * FROM subclubs WHERE address = ?', [address]);
        return rows[0];
      }
    } catch (error) {
      console.error('Database error in getSubClubByAddress:', error);
      throw error;
    }
  },

  async addSubClubMember(subClubId, userId, walletAddress) {
    try {
      if (DB_TYPE === 'postgresql') {
        const result = await db.query(
          'INSERT INTO subclub_members (subclub_id, user_id, wallet_address) VALUES ($1, $2, $3) RETURNING *',
          [subClubId, userId, walletAddress]
        );
        return result.rows[0];
      } else {
        await db.execute(
          'INSERT INTO subclub_members (subclub_id, user_id, wallet_address) VALUES (?, ?, ?)',
          [subClubId, userId, walletAddress]
        );
        return { subclub_id: subClubId, user_id: userId, wallet_address: walletAddress };
      }
    } catch (error) {
      console.error('Database error in addSubClubMember:', error);
      throw error;
    }
  },

  async recordDeposit(depositData) {
    try {
      if (DB_TYPE === 'postgresql') {
        const result = await db.query(
          'INSERT INTO deposits (subclub_id, user_id, amount, transaction_hash, block_number) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [depositData.subclub_id, depositData.user_id, depositData.amount, depositData.transaction_hash, depositData.block_number]
        );
        return result.rows[0];
      } else {
        await db.execute(
          'INSERT INTO deposits (subclub_id, user_id, amount, transaction_hash, block_number) VALUES (?, ?, ?, ?, ?)',
          [depositData.subclub_id, depositData.user_id, depositData.amount, depositData.transaction_hash, depositData.block_number]
        );
        return depositData;
      }
    } catch (error) {
      console.error('Database error in recordDeposit:', error);
      throw error;
    }
  },

  async recordEmergencyEvent(eventData) {
    try {
      if (DB_TYPE === 'postgresql') {
        const result = await db.query(
          'INSERT INTO emergency_events (subclub_id, user_id, event_type, reason, transaction_hash, block_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
          [eventData.subclub_id, eventData.user_id, eventData.event_type, eventData.reason, eventData.transaction_hash, eventData.block_number]
        );
        return result.rows[0];
      } else {
        await db.execute(
          'INSERT INTO emergency_events (subclub_id, user_id, event_type, reason, transaction_hash, block_number) VALUES (?, ?, ?, ?, ?, ?)',
          [eventData.subclub_id, eventData.user_id, eventData.event_type, eventData.reason, eventData.transaction_hash, eventData.block_number]
        );
        return eventData;
      }
    } catch (error) {
      console.error('Database error in recordEmergencyEvent:', error);
      throw error;
    }
  }
};

module.exports = dbOperations;
