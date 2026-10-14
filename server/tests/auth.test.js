const request = require('supertest');
const bcrypt = require('bcrypt');
const { createUser, findUserByEmail } = require('../src/models/userModel');
const { saveRefreshToken, findRefreshToken, deleteRefreshToken } = require('../src/models/refreshTokenModel');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../src/utils/jwt');
const app = require('../src/app');

jest.mock('bcrypt');
jest.mock('../src/models/userModel', () => ({
  createUser: jest.fn(),
  findUserByEmail: jest.fn(),
}));
jest.mock('../src/models/refreshTokenModel', () => ({
  saveRefreshToken: jest.fn(),
  findRefreshToken: jest.fn(),
  deleteRefreshToken: jest.fn(),
}));
jest.mock('../src/utils/jwt', () => ({
  generateAccessToken: jest.fn(),
  generateRefreshToken: jest.fn(),
  verifyToken: jest.fn(),
}));

describe('POST /api/v1/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when required fields are missing', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'user@example.com', password: 'password123' });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(createUser).not.toHaveBeenCalled();
  });

  it('returns 400 when the password is shorter than eight characters', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'user@example.com', password: 'short', fullName: 'Test User' });

    expect(response.statusCode).toBe(400);
    expect(createUser).not.toHaveBeenCalled();
  });

  it('returns 400 when the email format is invalid', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'password123', fullName: 'Test User' });

    expect(response.statusCode).toBe(400);
    expect(createUser).not.toHaveBeenCalled();
  });

  it('returns 409 when the email is already registered', async () => {
    findUserByEmail.mockResolvedValue({ id: 1, email: 'user@example.com' });

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'user@example.com', password: 'password123', fullName: 'Test User' });

    expect(response.statusCode).toBe(409);
    expect(createUser).not.toHaveBeenCalled();
  });

  it('creates a user with a hashed password and returns 201', async () => {
    const user = { id: 1, email: 'user@example.com', full_name: 'Test User', role: 'user' };
    findUserByEmail.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('hashed-password');
    createUser.mockResolvedValue(user);

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'user@example.com', password: 'password123', fullName: 'Test User' });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    expect(createUser).toHaveBeenCalledWith({
      email: 'user@example.com',
      passwordHash: 'hashed-password',
      fullName: 'Test User',
    });
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when email or password is missing', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com' });

    expect(response.statusCode).toBe(400);
    expect(findUserByEmail).not.toHaveBeenCalled();
  });

  it('returns 401 when the user does not exist', async () => {
    findUserByEmail.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'missing@example.com', password: 'password123' });

    expect(response.statusCode).toBe(401);
    expect(response.body.message).toBe('Email atau password salah');
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('returns 401 when the password is incorrect', async () => {
    findUserByEmail.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      password_hash: 'stored-hash',
    });
    bcrypt.compare.mockResolvedValue(false);

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'wrong-password' });

    expect(response.statusCode).toBe(401);
    expect(bcrypt.compare).toHaveBeenCalledWith('wrong-password', 'stored-hash');
    expect(generateAccessToken).not.toHaveBeenCalled();
  });

  it('returns tokens and saves the refresh token after successful login', async () => {
    const user = {
      id: 1,
      email: 'user@example.com',
      password_hash: 'stored-hash',
      full_name: 'Test User',
      role: 'user',
    };
    findUserByEmail.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);
    generateAccessToken.mockReturnValue('access-token');
    generateRefreshToken.mockReturnValue('refresh-token');
    saveRefreshToken.mockResolvedValue(undefined);

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'password123' });

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toEqual({
      user: { id: 1, email: 'user@example.com', fullName: 'Test User', role: 'user' },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(saveRefreshToken).toHaveBeenCalledWith(expect.objectContaining({
      userId: 1,
      token: 'refresh-token',
      expiresAt: expect.any(Date),
    }));
  });
});

describe('POST /api/v1/auth/refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when the refresh token is missing', async () => {
    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .send({});

    expect(response.statusCode).toBe(400);
    expect(findRefreshToken).not.toHaveBeenCalled();
  });

  it('returns 401 when the refresh token is not stored or expired', async () => {
    findRefreshToken.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'unknown-token' });

    expect(response.statusCode).toBe(401);
    expect(generateAccessToken).not.toHaveBeenCalled();
  });

  it('returns a new access token for a valid refresh token', async () => {
    findRefreshToken.mockResolvedValue({ id: 1, user_id: 1 });
    verifyToken.mockReturnValue({ id: 1, email: 'user@example.com', role: 'user' });
    generateAccessToken.mockReturnValue('new-access-token');

    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'valid-refresh-token' });

    expect(response.statusCode).toBe(200);
    expect(response.body.data.accessToken).toBe('new-access-token');
    expect(findRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
  });
});

describe('POST /api/v1/auth/logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes the supplied refresh token and returns 200', async () => {
    deleteRefreshToken.mockResolvedValue(undefined);

    const response = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken: 'valid-refresh-token' });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Logout berhasil');
    expect(deleteRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
  });

  it('succeeds when no refresh token is supplied', async () => {
    const response = await request(app)
      .post('/api/v1/auth/logout')
      .send({});

    expect(response.statusCode).toBe(200);
    expect(deleteRefreshToken).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/auth/me', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the authenticated user', async () => {
    const tokenPayload = { id: 1, email: 'user@example.com', role: 'user', iat: 100, exp: 200 };
    verifyToken.mockReturnValue(tokenPayload);

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer access-token');

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toEqual({ id: 1, email: 'user@example.com', role: 'user' });
    expect(verifyToken).toHaveBeenCalledWith('access-token');
  });

  it('returns 401 when the authorization header is missing', async () => {
    const response = await request(app).get('/api/v1/auth/me');

    expect(response.statusCode).toBe(401);
    expect(verifyToken).not.toHaveBeenCalled();
  });
});