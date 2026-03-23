require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  console.log('\nSt Johns Training College — Database Setup\n');

  // First connect to postgres to create the database if it doesn't exist
  const adminPool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 5432,
    database: 'postgres',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  const dbName = process.env.DB_NAME || 'stjohns_college';

  try {
    // Create database if not exists
    const check = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]
    );
    if (check.rowCount === 0) {
      await adminPool.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database "${dbName}" created`);
    } else {
      console.log(`  Database "${dbName}" already exists`);
    }
  } catch (err) {
    console.error('Failed to create database:', err.message);
  } finally {
    await adminPool.end();
  }

  // Now connect to the target DB and run schema
  const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 5432,
    database: dbName,
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schemaSQL);
    console.log(' Schema applied successfully');

    // Run seed
    const { seedDatabase } = require('./seed');
    await seedDatabase(pool);

    console.log('\n Database setup complete!\n');
  } catch (err) {
    console.error(' Schema error:', err.message);
  } finally {
    await pool.end();
  }
}

setupDatabase();
