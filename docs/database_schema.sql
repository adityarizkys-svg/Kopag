-- Reference snapshot of the final relational schema.
-- For an existing database, apply server/migrations/001_initial_schema.sql
-- followed by server/migrations/002_inventory_and_roles.sql.
-- Do not apply this reference file on top of the migrations.

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'EMPLOYEE'
        CHECK (role IN ('OWNER', 'EMPLOYEE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
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

CREATE TABLE stock_transactions (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    type VARCHAR(3) NOT NULL CHECK (type IN ('IN', 'OUT')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    description TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE expired_logs (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    old_status VARCHAR(30)
        CHECK (old_status IS NULL OR old_status IN ('LAYAK_JUAL', 'MENDEKATI_EXPIRED', 'EXPIRED')),
    new_status VARCHAR(30) NOT NULL
        CHECK (new_status IN ('LAYAK_JUAL', 'MENDEKATI_EXPIRED', 'EXPIRED')),
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status_expired_date ON products(status, expired_date);
CREATE INDEX idx_products_name_lower ON products(LOWER(name));
CREATE INDEX idx_stock_transactions_product_created ON stock_transactions(product_id, created_at DESC);
CREATE INDEX idx_stock_transactions_created_at ON stock_transactions(created_at DESC);
CREATE INDEX idx_stock_transactions_type ON stock_transactions(type);
CREATE INDEX idx_expired_logs_product_checked ON expired_logs(product_id, checked_at DESC);
