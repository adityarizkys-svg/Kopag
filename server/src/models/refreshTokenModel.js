const pool = require('../config/database');

const saveRefreshToken = async ({ userId, token, expiresAt }) => {
  const query = `
    INSERT INTO refresh_tokens (user_id, token, expires_at)
    VALUES ($1, $2, $3)
    RETURNING id
  `;
  const result = await pool.query(query, [userId, token, expiresAt]);
  return result.rows[0];
};

const findRefreshToken = async (token) => {
  const query =
    'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()';
  const result = await pool.query(query, [token]);
  return result.rows[0];
};

const deleteRefreshToken = async (token) => {
  await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
};

module.exports = { saveRefreshToken, findRefreshToken, deleteRefreshToken };
