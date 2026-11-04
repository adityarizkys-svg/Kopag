const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-secret-with-enough-length';

jest.mock('../src/services/reportService', () => ({
  getDashboardReport: jest.fn(),
  getStockHistory: jest.fn(),
}));

const reportService = require('../src/services/reportService');
const app = require('../src/app');

const createToken = (role) => jwt.sign(
  { id: 1, email: 'test@example.com', role },
  process.env.JWT_SECRET,
  { expiresIn: '5m' }
);

describe('Reports API', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/v1/reports/dashboard', () => {
    it('rejects requests without an access token', async () => {
      const response = await request(app).get('/api/v1/reports/dashboard');
      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('rejects EMPLOYEE role', async () => {
      const response = await request(app)
        .get('/api/v1/reports/dashboard')
        .set('Authorization', `Bearer ${createToken('EMPLOYEE')}`);

      expect(response.statusCode).toBe(403);
      expect(reportService.getDashboardReport).not.toHaveBeenCalled();
    });

    it('returns dashboard metrics to OWNER', async () => {
      reportService.getDashboardReport.mockResolvedValue({
        totalProducts: 12,
        totalStock: 250,
        layakJual: 8,
        mendekatiExpired: 3,
        expired: 1,
      });

      const response = await request(app)
        .get('/api/v1/reports/dashboard')
        .set('Authorization', `Bearer ${createToken('OWNER')}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.data.totalProducts).toBe(12);
      expect(response.body.data.totalStock).toBe(250);
    });
  });

  describe('GET /api/v1/reports/stock-history', () => {
    it('validates pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/reports/stock-history?page=0')
        .set('Authorization', `Bearer ${createToken('OWNER')}`);

      expect(response.statusCode).toBe(400);
      expect(reportService.getStockHistory).not.toHaveBeenCalled();
    });

    it('validates date range', async () => {
      const response = await request(app)
        .get('/api/v1/reports/stock-history?from=2026-11-10&to=2026-11-01')
        .set('Authorization', `Bearer ${createToken('OWNER')}`);

      expect(response.statusCode).toBe(400);
      expect(reportService.getStockHistory).not.toHaveBeenCalled();
    });

    it('returns paginated stock history with filters', async () => {
      reportService.getStockHistory.mockResolvedValue({
        items: [{
          id: 10,
          type: 'IN',
          quantity: 5,
          product: { id: 2, name: 'Susu UHT' },
          createdBy: { id: 1, name: 'Owner', email: 'owner@example.com' },
        }],
        pagination: { page: 2, limit: 5, total: 6, totalPages: 2 },
      });

      const response = await request(app)
        .get('/api/v1/reports/stock-history?page=2&limit=5&type=in&productId=2&from=2026-11-01&to=2026-11-04')
        .set('Authorization', `Bearer ${createToken('OWNER')}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.data.pagination.page).toBe(2);
      expect(reportService.getStockHistory).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        type: 'IN',
        productId: 2,
        from: '2026-11-01',
        to: '2026-11-04',
      });
    });
  });
});
