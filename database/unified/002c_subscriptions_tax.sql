-- Unified Bertina | 002c recurring products, fiscal and FX extension (disabled until acceptance)
SET NAMES utf8mb4;
SET time_zone = '+00:00';
CREATE TABLE IF NOT EXISTS eco_subscription_plans (
  id CHAR(36) NOT NULL PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  billing_period VARCHAR(24) NOT NULL,
  cycle_count INT UNSIGNED NOT NULL DEFAULT 1,
  renewal_mode VARCHAR(24) NOT NULL DEFAULT 'MANUAL',
  state VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (product_id) REFERENCES eco_products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_subscriptions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  plan_id CHAR(36) NOT NULL,
  account_id CHAR(36) NOT NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  period_starts_at DATETIME(3) NULL,
  period_ends_at DATETIME(3) NULL,
  cancelled_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_eco_subscription_account (account_id,state),
  FOREIGN KEY (plan_id) REFERENCES eco_subscription_plans(id) ON DELETE RESTRICT,
  FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_subscription_cycles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  subscription_id CHAR(36) NOT NULL,
  cycle_number INT UNSIGNED NOT NULL,
  commerce_order_id CHAR(36) NULL,
  due_at DATETIME(3) NOT NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'DUE',
  UNIQUE KEY uq_eco_sub_cycle (subscription_id,cycle_number),
  FOREIGN KEY (subscription_id) REFERENCES eco_subscriptions(id) ON DELETE RESTRICT,
  FOREIGN KEY (commerce_order_id) REFERENCES commerce_orders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_tax_rules (
  id CHAR(36) NOT NULL PRIMARY KEY,
  jurisdiction VARCHAR(40) NOT NULL,
  category_code VARCHAR(60) NOT NULL,
  effective_from DATE NOT NULL,
  effective_until DATE NULL,
  rate_basis_points INT UNSIGNED NOT NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  UNIQUE KEY uq_eco_tax_date (jurisdiction,category_code,effective_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_fx_rate_versions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  base_currency CHAR(3) NOT NULL,
  quote_currency CHAR(3) NOT NULL,
  rate_decimal DECIMAL(24,12) NOT NULL,
  source_code VARCHAR(80) NOT NULL,
  valid_at DATETIME(3) NOT NULL,
  approval_state VARCHAR(24) NOT NULL DEFAULT 'UNVERIFIED',
  UNIQUE KEY uq_eco_fx_source (base_currency,quote_currency,source_code,valid_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
