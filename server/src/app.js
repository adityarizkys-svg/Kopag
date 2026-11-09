'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const routes = require('./routes/index');

dotenv.config();
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/v1/health', (req, res) =>
  res.json({ success: true, message: 'Server running' })
);

// All versioned API routes
app.use('/api/v1', routes);

module.exports = app;
