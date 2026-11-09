const { Pool, types } = require('pg');

// Parse DATE type (Oid 1082) as plain string 'YYYY-MM-DD' instead of JS Date object
types.setTypeParser(1082, (value) => value);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Database error:', err.message);
});

module.exports = pool;
