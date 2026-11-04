-- Inventory tables and project roles for Expired Stock Management System.
-- Apply after 001_initial_schema.sql.

BEGIN;

-- Align the original authentication roles with the project specification.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
UPDATE users
SET role = CASE
    WHEN LOWER(role) IN ('admin', 'owner') THEN 'OWNER'
    ELSE 'EMPLOYEE'
END;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'EMPLOYEE';
ALTER TABLE users
    ADD CONSTRAINT users_role_check CHECK (role IN ('OWNER', 'EMPLOYEE'));

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(180) NOT NULL,
    description TEXT,
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    unit VARCHAR(40) NOT NULL DEFAULT 'pcs',
    purchase_price NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
    selling_price NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
    production_date DATE NOT NULL,
    expired_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'LAYAK_JUAL'
        CHECK (status IN ('LAYAK_JUAL', 'MENDEKATI_EXPIRED', 'EXPIRED')),
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT products_date_order_check CHECK (expired_date > production_date)
);

CREATE TABLE IF NOT EXISTS stock_transactions (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    type VARCHAR(3) NOT NULL CHECK (type IN ('IN', 'OUT')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    description TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expired_logs (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    old_status VARCHAR(30)
        CHECK (old_status IS NULL OR old_status IN ('LAYAK_JUAL', 'MENDEKATI_EXPIRED', 'EXPIRED')),
    new_status VARCHAR(30) NOT NULL
        CHECK (new_status IN ('LAYAK_JUAL', 'MENDEKATI_EXPIRED', 'EXPIRED')),
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status_expired_date ON products(status, expired_date);
CREATE INDEX IF NOT EXISTS idx_products_name_lower ON products(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_stock_transactions_product_created
    ON stock_transactions(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_created_at
    ON stock_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_type ON stock_transactions(type);
CREATE INDEX IF NOT EXISTS idx_expired_logs_product_checked
    ON expired_logs(product_id, checked_at DESC);

COMMIT;
