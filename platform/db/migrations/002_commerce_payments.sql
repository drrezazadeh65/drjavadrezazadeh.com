-- CORE PLATFORM MIGRATION 002
-- Commerce, payments and entitlements
-- Provider-neutral PostgreSQL baseline; not yet applied to production.

BEGIN;

CREATE TABLE IF NOT EXISTS product (
  id uuid PRIMARY KEY,
  product_type text NOT NULL
    CHECK (product_type IN ('CONSULTATION','PHYSICAL_BOOK','EBOOK','WORKBOOK','ASSESSMENT','REPORT','COURSE','TOOLKIT','INSTITUTION_SERVICE')),
  slug text UNIQUE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','ACTIVE','ARCHIVED')),
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price (
  id uuid PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  currency char(3) NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','INACTIVE')),
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS price_product_idx ON price(product_id, status);

CREATE TABLE IF NOT EXISTS cart (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN','CONVERTED','ABANDONED','EXPIRED')),
  currency char(3),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_item (
  id uuid PRIMARY KEY,
  cart_id uuid NOT NULL REFERENCES cart(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES product(id) ON DELETE RESTRICT,
  price_id uuid NOT NULL REFERENCES price(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_order (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  consultation_request_id uuid REFERENCES consultation_request(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','AWAITING_PAYMENT','PAID','FULFILLING','COMPLETED','CANCELLED','REFUNDED','PARTIALLY_REFUNDED')),
  currency char(3) NOT NULL,
  subtotal_minor bigint NOT NULL CHECK (subtotal_minor >= 0),
  discount_minor bigint NOT NULL DEFAULT 0 CHECK (discount_minor >= 0),
  total_minor bigint NOT NULL CHECK (total_minor >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_order_user_idx ON customer_order(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS customer_order_status_idx ON customer_order(status);

CREATE TABLE IF NOT EXISTS order_item (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES customer_order(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES product(id) ON DELETE RESTRICT,
  price_id uuid NOT NULL REFERENCES price(id) ON DELETE RESTRICT,
  title_snapshot text NOT NULL,
  unit_amount_minor bigint NOT NULL CHECK (unit_amount_minor >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  line_total_minor bigint NOT NULL CHECK (line_total_minor >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS payment_intent (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES customer_order(id) ON DELETE CASCADE,
  provider_key text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency char(3) NOT NULL,
  status text NOT NULL DEFAULT 'CREATED'
    CHECK (status IN ('CREATED','PENDING','PAID','FAILED','CANCELLED','REFUNDED')),
  provider_reference text,
  redirect_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_intent_order_idx ON payment_intent(order_id);

CREATE TABLE IF NOT EXISTS payment (
  id uuid PRIMARY KEY,
  payment_intent_id uuid NOT NULL REFERENCES payment_intent(id) ON DELETE RESTRICT,
  provider_key text NOT NULL,
  provider_reference text NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency char(3) NOT NULL,
  status text NOT NULL
    CHECK (status IN ('VERIFIED','FAILED','REVERSED')),
  verified_at timestamptz,
  raw_reference_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_key, provider_reference)
);

CREATE TABLE IF NOT EXISTS refund (
  id uuid PRIMARY KEY,
  payment_id uuid NOT NULL REFERENCES payment(id) ON DELETE RESTRICT,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  status text NOT NULL
    CHECK (status IN ('REQUESTED','PENDING','COMPLETED','FAILED','CANCELLED')),
  reason text,
  provider_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entitlement (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES order_item(id) ON DELETE CASCADE,
  entitlement_type text NOT NULL
    CHECK (entitlement_type IN ('DIGITAL_DOWNLOAD','ASSESSMENT_ACCESS','REPORT_ACCESS','COURSE_ACCESS','CONSULTATION_ACCESS')),
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','EXPIRED','REVOKED')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, order_item_id, entitlement_type)
);

CREATE TABLE IF NOT EXISTS invoice (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL UNIQUE REFERENCES customer_order(id) ON DELETE RESTRICT,
  invoice_number text UNIQUE,
  issued_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

COMMIT;
