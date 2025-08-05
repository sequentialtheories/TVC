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

  async createUser({ email, passwordHash, walletAddress }) {
    try {
      if (DB_TYPE === 'postgresql') {
        const result = await db.query(
          'INSERT INTO users (email, password_hash, wallet_address, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id',
          [email, passwordHash, walletAddress]
        );
        return result.rows[0].id;
      } else {
        const [result] = await db.execute(
          'INSERT INTO users (email, password_hash, wallet_address, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
          [email, passwordHash, walletAddress]
        );
        return result.insertId;
      }
    } catch (error) {
      console.error('Database error in createUser:', error);
      throw error;
    }
  },

  async updateUser(id, { walletAddress }) {
    try {
      if (DB_TYPE === 'postgresql') {
        await db.query(
          'UPDATE users SET wallet_address = $1, updated_at = NOW() WHERE id = $2',
          [walletAddress, id]
        );
      } else {
        await db.execute(
          'UPDATE users SET wallet_address = ?, updated_at = NOW() WHERE id = ?',
          [walletAddress, id]
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
  }
};

module.exports = dbOperations;
