// server/config/database.js
const mysql = require('mysql2/promise');
require('dotenv').config();

// Create MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'cineai',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000
});

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL database');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Error connecting to database:', error.message);
    console.error('Make sure MySQL is running and credentials are correct');
    return false;
  }
};

module.exports = { pool, testConnection };