-- Book fulfilment, stock, delivery and shipping foundation.
BEGIN;

CREATE TABLE IF NOT EXISTS book_product_detail (
  product_id uuid PRIMARY KEY REFERENCES product(id) ON DELETE CASCADE,
  isbn text,
  author_name text NOT NULL,
  publisher_name text,
  publication_year integer,
  edition_text text,
  language_code text NOT NULL DEFAULT 'fa',
  metadata_verified_at timestamptz
);

CREATE TABLE IF NOT EXISTS book_inventory (
  id uuid PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  sku text UNIQUE NOT NULL,
  format text NOT NULL CHECK (format IN ('PHYSICAL_BOOK','EBOOK','WORKBOOK')),
  stock_on_hand integer CHECK (stock_on_hand IS NULL OR stock_on_hand>=0),
  stock_reserved integer NOT NULL DEFAULT 0 CHECK (stock_reserved>=0),
  digital boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'INACTIVE' CHECK (status IN ('INACTIVE','IN_STOCK','OUT_OF_STOCK','PREORDER')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (digital OR stock_on_hand IS NOT NULL),
  CHECK (digital OR stock_reserved<=stock_on_hand)
);

CREATE TABLE IF NOT EXISTS shipping_address (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  recipient_name text NOT NULL,
  phone_e164 text,
  country_code char(2) NOT NULL,
  region text,
  city text NOT NULL,
  postal_code text,
  address_line text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE shipping_address IS
  'Private fulfilment data. Never expose in public pages, analytics, search indexes or logs.';

CREATE TABLE IF NOT EXISTS shipment (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES customer_order(id) ON DELETE RESTRICT,
  shipping_address_id uuid NOT NULL REFERENCES shipping_address(id) ON DELETE RESTRICT,
  carrier_key text,
  tracking_reference text,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','PACKING','SHIPPED','DELIVERED','RETURN_REQUESTED','RETURNED','CANCELLED')),
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shipment_order_idx ON shipment(order_id,created_at DESC);

CREATE TABLE IF NOT EXISTS digital_delivery_asset (
  id uuid PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  storage_object_key text NOT NULL,
  status text NOT NULL DEFAULT 'INACTIVE' CHECK (status IN ('INACTIVE','ACTIVE','RETIRED')),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
