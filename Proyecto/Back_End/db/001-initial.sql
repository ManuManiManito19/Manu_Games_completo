CREATE TABLE users (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client' CHECK(role IN ('client','admin')), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
CREATE TABLE sessions (
  id TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  csrf TEXT NOT NULL, expires_at INTEGER NOT NULL
) STRICT;
CREATE TABLE addresses (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL, street TEXT NOT NULL, city TEXT NOT NULL, region TEXT NOT NULL,
  postal_code TEXT NOT NULL CHECK(postal_code GLOB '[0-9][0-9][0-9][0-9][0-9]')
) STRICT;
CREATE TABLE categories (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
) STRICT;
CREATE TABLE products (
  id INTEGER PRIMARY KEY, sku TEXT NOT NULL UNIQUE, category_id INTEGER NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL, family TEXT NOT NULL, description TEXT NOT NULL, platform TEXT NOT NULL, image TEXT NOT NULL,
  price INTEGER NOT NULL CHECK(price BETWEEN 1 AND 10000000),
  stock INTEGER NOT NULL DEFAULT 0 CHECK(stock BETWEEN 0 AND 1000000),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
) STRICT;
CREATE TABLE carts (
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99),
  PRIMARY KEY(session_id,product_id)
) STRICT;
CREATE TABLE coupons (
  code TEXT PRIMARY KEY, percent INTEGER NOT NULL CHECK(percent BETWEEN 1 AND 80),
  ends_at TEXT NOT NULL, max_uses INTEGER NOT NULL CHECK(max_uses > 0), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
) STRICT;
CREATE TABLE orders (
  id INTEGER PRIMARY KEY, folio TEXT NOT NULL UNIQUE, user_id INTEGER NOT NULL REFERENCES users(id),
  request_key TEXT NOT NULL, address_snapshot TEXT NOT NULL CHECK(json_valid(address_snapshot)),
  subtotal INTEGER NOT NULL CHECK(subtotal >= 0), discount INTEGER NOT NULL CHECK(discount BETWEEN 0 AND subtotal),
  shipping INTEGER NOT NULL CHECK(shipping >= 0), tax INTEGER NOT NULL CHECK(tax >= 0),
  total INTEGER NOT NULL CHECK(total = subtotal - discount + shipping + tax),
  coupon_code TEXT REFERENCES coupons(code),
  status TEXT NOT NULL CHECK(status IN ('pending','paid','preparing','sent','delivered','cancelled','refunded')),
  terms_version TEXT NOT NULL, consent_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id,request_key)
) STRICT;
CREATE TABLE order_items (
  order_id INTEGER NOT NULL REFERENCES orders(id), product_id INTEGER NOT NULL REFERENCES products(id),
  sku TEXT NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL, platform TEXT NOT NULL,
  unit_price INTEGER NOT NULL CHECK(unit_price > 0), quantity INTEGER NOT NULL CHECK(quantity > 0),
  PRIMARY KEY(order_id,product_id)
) STRICT;
CREATE TABLE payments (
  order_id INTEGER PRIMARY KEY REFERENCES orders(id), reference TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL CHECK(amount >= 0), status TEXT NOT NULL CHECK(status IN ('pending','approved','declined','refunded')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
CREATE TABLE shipments (
  order_id INTEGER PRIMARY KEY REFERENCES orders(id), method TEXT NOT NULL CHECK(method = 'digital'),
  tracking TEXT UNIQUE, status TEXT NOT NULL CHECK(status IN ('pending','preparing','sent','delivered','cancelled')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
CREATE TABLE inventory_movements (
  id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id), delta INTEGER NOT NULL CHECK(delta <> 0),
  reason TEXT NOT NULL, actor_id INTEGER REFERENCES users(id), order_id INTEGER REFERENCES orders(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
CREATE TABLE cases (
  id INTEGER PRIMARY KEY, folio TEXT NOT NULL UNIQUE, user_id INTEGER NOT NULL REFERENCES users(id),
  order_id INTEGER REFERENCES orders(id), product_id INTEGER REFERENCES products(id),
  kind TEXT NOT NULL CHECK(kind IN ('cancel','return','warranty','support','privacy')),
  reason TEXT NOT NULL, evidence TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','needs_info','approved','denied')),
  resolution TEXT, action TEXT CHECK(action IN ('refund','replacement','none')),
  actor_id INTEGER REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, resolved_at TEXT
) STRICT;
CREATE TABLE case_messages (
  id INTEGER PRIMARY KEY, case_id INTEGER NOT NULL REFERENCES cases(id),
  actor_id INTEGER NOT NULL REFERENCES users(id), body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY, actor_id INTEGER REFERENCES users(id), action TEXT NOT NULL,
  entity TEXT NOT NULL, entity_id TEXT NOT NULL, detail TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
CREATE INDEX ix_sessions_expiry ON sessions(expires_at);
CREATE INDEX ix_addresses_user ON addresses(user_id);
CREATE INDEX ix_products_catalog ON products(active,category_id,price,id);
CREATE INDEX ix_orders_customer ON orders(user_id,id DESC);
CREATE INDEX ix_orders_coupon ON orders(coupon_code,status);
CREATE INDEX ix_movements_product ON inventory_movements(product_id,id DESC);
CREATE INDEX ix_cases_user ON cases(user_id,id DESC);
CREATE INDEX ix_cases_order ON cases(order_id,status);
CREATE INDEX ix_messages_case ON case_messages(case_id,id);
CREATE INDEX ix_audit_entity ON audit_logs(entity,entity_id,id);
CREATE VIEW sales_report AS
SELECT o.id,o.folio,o.created_at,o.total,o.status FROM orders o JOIN payments p ON p.order_id=o.id
WHERE p.status='approved';
