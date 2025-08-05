const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'vault_club'}`);
    console.log('Database created or already exists');

    await connection.execute(`USE ${process.env.DB_NAME || 'vault_club'}`);

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim() && !statement.trim().startsWith('/*')) {
        await connection.execute(statement);
      }
    }

    console.log('Database schema initialized successfully');
    await connection.end();

  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  require('dotenv').config();
  initializeDatabase();
}

module.exports = initializeDatabase;
