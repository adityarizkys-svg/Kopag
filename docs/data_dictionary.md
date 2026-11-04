# Data Dictionary – Expired Stock Management System

## users
| Column | Type | Rules | Description |
|---|---|---|---|
| id | SERIAL | PK | User identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt password hash |
| full_name | VARCHAR(255) | NOT NULL | User name |
| role | VARCHAR(50) | OWNER or EMPLOYEE | User access role |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Update time |

## refresh_tokens
| Column | Type | Rules | Description |
|---|---|---|---|
| id | SERIAL | PK | Token record |
| user_id | INTEGER | FK users(id), ON DELETE CASCADE | Token owner |
| token | VARCHAR(500) | NOT NULL | Refresh token (current implementation stores raw JWT; hashing is a follow-up security improvement) |
| expires_at | TIMESTAMPTZ | NOT NULL | Expiration time |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |

## categories
| Column | Type | Rules | Description |
|---|---|---|---|
| id | SERIAL | PK | Category identifier |
| uuid | UUID | UNIQUE, DEFAULT gen_random_uuid() | Public identifier |
| name | VARCHAR(120) | UNIQUE, NOT NULL | Category name |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Update time |

## products
| Column | Type | Rules | Description |
|---|---|---|---|
| id | SERIAL | PK | Product identifier |
| uuid | UUID | UNIQUE, DEFAULT gen_random_uuid() | Public identifier |
| category_id | INTEGER | FK categories(id), SET NULL | Product category |
| name | VARCHAR(180) | NOT NULL | Product name |
| description | TEXT | NULL | Product description |
| stock | INTEGER | >= 0, DEFAULT 0 | Current stock |
| unit | VARCHAR(40) | NOT NULL | Stock unit |
| purchase_price | NUMERIC(14,2) | >= 0 | Purchase price |
| selling_price | NUMERIC(14,2) | >= 0 | Selling price |
| production_date | DATE | NOT NULL | Production date |
| expired_date | DATE | > production_date | Expiration date |
| status | VARCHAR(30) | LAYAK_JUAL, MENDEKATI_EXPIRED, EXPIRED | Expiration classification |
| image_url | TEXT | NULL | Supabase Storage image URL (or approved storage URL) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Update time |

## stock_transactions
| Column | Type | Rules | Description |
|---|---|---|---|
| id | SERIAL | PK | Transaction identifier |
| uuid | UUID | UNIQUE, DEFAULT gen_random_uuid() | Public identifier |
| product_id | INTEGER | FK products(id), RESTRICT | Related product |
| type | VARCHAR(3) | IN or OUT | Stock direction |
| quantity | INTEGER | > 0 | Transaction quantity |
| description | TEXT | NULL | Transaction note |
| created_by | INTEGER | FK users(id), SET NULL | User who made transaction |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Transaction time |

## expired_logs
| Column | Type | Rules | Description |
|---|---|---|---|
| id | SERIAL | PK | Log identifier |
| uuid | UUID | UNIQUE, DEFAULT gen_random_uuid() | Public identifier |
| product_id | INTEGER | FK products(id), CASCADE | Related product |
| old_status | VARCHAR(30) | NULL or valid status | Previous status |
| new_status | VARCHAR(30) | Valid status | New status |
| checked_at | TIMESTAMPTZ | DEFAULT NOW() | Status check time |

## Relationships
- users 1:N stock_transactions
- categories 1:N products
- products 1:N stock_transactions
- products 1:N expired_logs
