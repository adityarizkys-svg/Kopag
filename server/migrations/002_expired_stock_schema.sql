-- ============================================================
-- 002_expired_stock_schema.sql
-- Stock Management System Based on Expiry Date (Kopag)
-- ============================================================

-- Drop existing tables in reverse dependency order
DROP TRIGGER IF EXISTS trg_update_product_status ON products;
DROP FUNCTION IF EXISTS calculate_product_status();
DROP TABLE IF EXISTS expired_logs CASCADE;
DROP TABLE IF EXISTS stock_transactions CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id           SERIAL PRIMARY KEY,
  email        VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name    VARCHAR(255) NOT NULL,
  role         VARCHAR(50)  NOT NULL DEFAULT 'employee' CHECK (role IN ('owner', 'employee')),
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);

-- ============================================================
-- REFRESH TOKENS
-- ============================================================
CREATE TABLE refresh_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token      TEXT         NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ  NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_token   ON refresh_tokens (token);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_name ON categories (name);

-- ============================================================
-- STATUS FUNCTION & TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_product_status()
RETURNS TRIGGER AS $$
DECLARE
  today_jakarta DATE;
  diff_days     INTEGER;
BEGIN
  today_jakarta := (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE;
  diff_days     := NEW.expired_date - today_jakarta;

  IF diff_days <= 0 THEN
    NEW.status := 'EXPIRED';
  ELSIF diff_days <= 30 THEN
    NEW.status := 'MENDEKATI_EXPIRED';
  ELSE
    NEW.status := 'LAYAK_JUAL';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  category_id  INTEGER      REFERENCES categories (id) ON DELETE SET NULL,
  description  TEXT,
  unit         VARCHAR(50)  NOT NULL,
  quantity     INTEGER      NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  expired_date DATE         NOT NULL,
  status       VARCHAR(30)  NOT NULL DEFAULT 'LAYAK_JUAL'
                 CHECK (status IN ('LAYAK_JUAL', 'MENDEKATI_EXPIRED', 'EXPIRED')),
  created_by   INTEGER      REFERENCES users (id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_category_id  ON products (category_id);
CREATE INDEX idx_products_status       ON products (status);
CREATE INDEX idx_products_expired_date ON products (expired_date);
CREATE INDEX idx_products_name         ON products (name);

CREATE TRIGGER trg_update_product_status
BEFORE INSERT OR UPDATE OF expired_date ON products
FOR EACH ROW EXECUTE FUNCTION calculate_product_status();

-- ============================================================
-- STOCK TRANSACTIONS
-- ============================================================
CREATE TABLE stock_transactions (
  id           SERIAL PRIMARY KEY,
  product_id   INTEGER      NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  type         VARCHAR(20)  NOT NULL CHECK (type IN ('stock_in', 'stock_out')),
  quantity     INTEGER      NOT NULL CHECK (quantity > 0),
  notes        TEXT,
  performed_by INTEGER      REFERENCES users (id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_transactions_product_id ON stock_transactions (product_id);
CREATE INDEX idx_stock_transactions_type       ON stock_transactions (type);
CREATE INDEX idx_stock_transactions_created_at ON stock_transactions (created_at);

-- ============================================================
-- EXPIRED LOGS
-- ============================================================
CREATE TABLE expired_logs (
  id                SERIAL PRIMARY KEY,
  product_id        INTEGER      NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  quantity_at_expiry INTEGER     NOT NULL,
  logged_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expired_logs_product_id ON expired_logs (product_id);
CREATE INDEX idx_expired_logs_logged_at  ON expired_logs (logged_at);
