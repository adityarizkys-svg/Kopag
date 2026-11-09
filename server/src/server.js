const app = require('./app');
const pool = require('./config/database');

const PORT = process.env.PORT || 5000;

pool
  .query('SELECT NOW()')
  .then(() => {
    console.log('✅ Database connected');
    app.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error('❌ Database error:', err.message);
  });
