const pool = require('../config/database');

const createUser = async ({ email, passwordHash, fullName, role = 'EMPLOYEE' }) => {
  const query = `
    INSERT INTO users (email, password_hash, full_name, role)
    VALUES ($1, $2, $3, $4)
    RETURNING id, email, full_name, role, created_at
  `;
  const values = [email, passwordHash, fullName, role];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const findUserByEmail = async (email) => {
  const query = 'SELECT * FROM users WHERE email = $1';
  const result = await pool.query(query, [email]);
  return result.rows[0];
};

const findUserById = async (id) => {
  const query = 'SELECT id, email, full_name, role, created_at FROM users WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

module.exports = { createUser, findUserByEmail, findUserById };
