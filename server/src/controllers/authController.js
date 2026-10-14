const bcrypt = require('bcrypt');
const { createUser, findUserByEmail } = require('../models/userModel');
const { saveRefreshToken, findRefreshToken, deleteRefreshToken } = require('../models/refreshTokenModel');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/jwt');

const register = async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ success: false, message: 'Email, password, dan fullName wajib diisi' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password minimal 8 karakter' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Format email tidak valid' });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email sudah terdaftar' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({ email, passwordHash, fullName });

    return res.status(201).json({ success: true, message: 'Registrasi berhasil', data: user });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Email atau password salah' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Email atau password salah' });
    }

    const payload = { id: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await saveRefreshToken({ userId: user.id, token: refreshToken, expiresAt });

    return res.status(200).json({
      success: true,
      message: 'Login berhasil',
      data: {
        user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token wajib diisi' });
    }

    const stored = await findRefreshToken(refreshToken);
    if (!stored) {
      return res.status(401).json({ success: false, message: 'Refresh token tidak valid atau kadaluarsa' });
    }

    const decoded = verifyToken(refreshToken);
    const accessToken = generateAccessToken({ id: decoded.id, email: decoded.email, role: decoded.role });

    return res.status(200).json({ success: true, data: { accessToken } });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Refresh token tidak valid' });
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await deleteRefreshToken(refreshToken);
    }
    return res.status(200).json({ success: true, message: 'Logout berhasil' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const getMe = async (req, res) => {
  const { id, email, role } = req.user;
  return res.status(200).json({ success: true, data: { id, email, role } });
};

module.exports = { register, login, refresh, logout, getMe };