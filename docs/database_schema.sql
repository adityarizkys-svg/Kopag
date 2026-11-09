-- =====================================================================
-- SISTEM STOK EXPIRED DATE - SKEMA LENGKAP (SUPABASE)
-- =====================================================================

-- ---------- 1. AUTH ----------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  role          VARCHAR(50)  NOT NULL DEFAULT 'employee',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
UPDATE public.users SET role = 'owner'    WHERE role = 'admin';
UPDATE public.users SET role = 'employee' WHERE role = 'user';
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'employee';
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check CHECK (role IN ('owner', 'employee'));

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token      VARCHAR(500) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email            ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON public.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token   ON public.refresh_tokens(token);

-- ---------- 2. KATEGORI ----------
CREATE TABLE IF NOT EXISTS public.categories (
  id            SERIAL PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------- 3. PRODUK ----------
CREATE TABLE IF NOT EXISTS public.products (
  id              SERIAL PRIMARY KEY,
  category_id     INTEGER REFERENCES public.categories(id) ON DELETE SET NULL,
  name            VARCHAR(255)  NOT NULL,
  stock           INTEGER       NOT NULL DEFAULT 0 CHECK (stock >= 0),
  unit            VARCHAR(30)   NOT NULL DEFAULT 'pcs',
  purchase_price  NUMERIC(12,2) NOT NULL CHECK (purchase_price >= 0),
  selling_price   NUMERIC(12,2) NOT NULL CHECK (selling_price >= 0),
  production_date DATE NOT NULL,
  expired_date    DATE NOT NULL,
  status          VARCHAR(30) NOT NULL DEFAULT 'LAYAK_JUAL'
                  CHECK (status IN ('LAYAK_JUAL', 'MENDEKATI_EXPIRED', 'EXPIRED')),
  image_url       TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_expired_after_production CHECK (expired_date > production_date)
);

CREATE INDEX IF NOT EXISTS idx_products_category     ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status       ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_expired_date ON public.products(expired_date);

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- 4. EXPIRED CHECKER ----------
CREATE TABLE IF NOT EXISTS public.expired_logs (
  id           SERIAL PRIMARY KEY,
  product_id   INTEGER NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  old_status   VARCHAR(30),
  new_status   VARCHAR(30) NOT NULL,
  checked_date DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'Asia/Jakarta')::date)
);

CREATE INDEX IF NOT EXISTS idx_expired_logs_product ON public.expired_logs(product_id);

CREATE OR REPLACE FUNCTION public.calc_product_status(p_expired DATE)
RETURNS VARCHAR
LANGUAGE plpgsql STABLE SET search_path = ''
AS $$
DECLARE
  today DATE := (NOW() AT TIME ZONE 'Asia/Jakarta')::date;
BEGIN
  IF today >= p_expired THEN
    RETURN 'EXPIRED';
  ELSIF p_expired - today <= 30 THEN
    RETURN 'MENDEKATI_EXPIRED';
  ELSE
    RETURN 'LAYAK_JUAL';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_product_expired_status()
RETURNS INTEGER
LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  changed INTEGER;
BEGIN
  WITH changes AS (
    SELECT id,
           status AS old_status,
           public.calc_product_status(expired_date) AS new_status
    FROM public.products
    WHERE status <> public.calc_product_status(expired_date)
  ), upd AS (
    UPDATE public.products p
    SET status = c.new_status
    FROM changes c
    WHERE p.id = c.id
    RETURNING p.id
  ), logs AS (
    INSERT INTO public.expired_logs (product_id, old_status, new_status)
    SELECT id, old_status, new_status FROM changes
    RETURNING 1
  )
  SELECT COUNT(*) INTO changed FROM upd;

  RETURN changed;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_set_product_status()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  NEW.status := public.calc_product_status(NEW.expired_date);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_set_status ON public.products;
CREATE TRIGGER trg_products_set_status
  BEFORE INSERT OR UPDATE OF expired_date ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_product_status();

SELECT public.update_product_expired_status();

-- ---------- 5. STOK ----------
CREATE TABLE IF NOT EXISTS public.stock_transactions (
  id          SERIAL PRIMARY KEY,
  product_id  INTEGER NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  type        VARCHAR(3) NOT NULL CHECK (type IN ('IN', 'OUT')),
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  description TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_tx_product ON public.stock_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_tx_created ON public.stock_transactions(created_at);

CREATE OR REPLACE FUNCTION public.stock_in(
  p_product_id  INTEGER,
  p_quantity    INTEGER,
  p_user_id     INTEGER DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS public.products
LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  v_product public.products;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Jumlah harus lebih dari 0';
  END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produk tidak ditemukan';
  END IF;
  IF public.calc_product_status(v_product.expired_date) = 'EXPIRED' THEN
    RAISE EXCEPTION 'Barang expired tidak dapat diproses';
  END IF;

  UPDATE public.products SET stock = stock + p_quantity
  WHERE id = p_product_id
  RETURNING * INTO v_product;

  INSERT INTO public.stock_transactions (product_id, user_id, type, quantity, description)
  VALUES (p_product_id, p_user_id, 'IN', p_quantity, p_description);

  RETURN v_product;
END;
$$;

CREATE OR REPLACE FUNCTION public.stock_out(
  p_product_id  INTEGER,
  p_quantity    INTEGER,
  p_user_id     INTEGER DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS public.products
LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  v_product public.products;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Jumlah harus lebih dari 0';
  END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produk tidak ditemukan';
  END IF;
  IF public.calc_product_status(v_product.expired_date) = 'EXPIRED' THEN
    RAISE EXCEPTION 'Barang expired tidak dapat diproses';
  END IF;
  IF v_product.stock < p_quantity THEN
    RAISE EXCEPTION 'Stok tidak mencukupi';
  END IF;

  UPDATE public.products SET stock = stock - p_quantity
  WHERE id = p_product_id
  RETURNING * INTO v_product;

  INSERT INTO public.stock_transactions (product_id, user_id, type, quantity, description)
  VALUES (p_product_id, p_user_id, 'OUT', p_quantity, p_description);

  RETURN v_product;
END;
$$;

-- ---------- 6. DASHBOARD, DISPLAY, MONITORING ----------
CREATE OR REPLACE VIEW public.v_dashboard_summary
WITH (security_invoker = true) AS
SELECT
  COUNT(*)                                                                               AS total_barang,
  COUNT(*) FILTER (WHERE public.calc_product_status(expired_date) = 'LAYAK_JUAL')        AS layak_jual,
  COUNT(*) FILTER (WHERE public.calc_product_status(expired_date) = 'MENDEKATI_EXPIRED') AS mendekati_expired,
  COUNT(*) FILTER (WHERE public.calc_product_status(expired_date) = 'EXPIRED')           AS expired
FROM public.products;

CREATE OR REPLACE VIEW public.v_products_status
WITH (security_invoker = true) AS
SELECT
  p.id, p.category_id, c.category_name, p.name, p.stock, p.unit,
  p.purchase_price, p.selling_price, p.production_date, p.expired_date,
  p.image_url,
  public.calc_product_status(p.expired_date) AS current_status,
  p.expired_date - ((NOW() AT TIME ZONE 'Asia/Jakarta')::date) AS days_left
FROM public.products p
LEFT JOIN public.categories c ON c.id = p.category_id;

CREATE OR REPLACE VIEW public.v_products_display
WITH (security_invoker = true) AS
SELECT * FROM public.v_products_status
WHERE stock > 0 AND current_status <> 'EXPIRED'
ORDER BY expired_date ASC;

CREATE OR REPLACE VIEW public.v_products_warning
WITH (security_invoker = true) AS
SELECT * FROM public.v_products_status
WHERE current_status = 'MENDEKATI_EXPIRED'
ORDER BY expired_date ASC;

CREATE OR REPLACE VIEW public.v_products_expired
WITH (security_invoker = true) AS
SELECT * FROM public.v_products_status
WHERE current_status = 'EXPIRED'
ORDER BY expired_date DESC;

-- ---------- 7. LAPORAN ----------
CREATE OR REPLACE FUNCTION public.get_stock_report(
  p_from DATE DEFAULT NULL,
  p_to   DATE DEFAULT NULL
)
RETURNS TABLE (
  product_id    INTEGER,
  product_name  VARCHAR,
  category_name VARCHAR,
  current_stock INTEGER,
  status        VARCHAR,
  expired_date  DATE,
  total_in      BIGINT,
  total_out     BIGINT
)
LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT
    p.id,
    p.name,
    c.category_name,
    p.stock,
    public.calc_product_status(p.expired_date),
    p.expired_date,
    COALESCE(SUM(t.quantity) FILTER (WHERE t.type = 'IN'),  0),
    COALESCE(SUM(t.quantity) FILTER (WHERE t.type = 'OUT'), 0)
  FROM public.products p
  LEFT JOIN public.categories c ON c.id = p.category_id
  LEFT JOIN public.stock_transactions t
         ON t.product_id = p.id
        AND (p_from IS NULL OR t.created_at >= p_from)
        AND (p_to   IS NULL OR t.created_at <  p_to + 1)
  GROUP BY p.id, c.category_name
  ORDER BY p.expired_date ASC;
$$;

-- ---------- 8. KEAMANAN (WAJIB, JANGAN DIHAPUS) ----------
ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refresh_tokens     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expired_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

-- Cek hasil: kolom rls_aktif harus true semua
SELECT tablename, rowsecurity AS rls_aktif
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;