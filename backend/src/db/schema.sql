-- ============================================
-- Gym Atlas - Schéma PostgreSQL complet
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========== USERS & AUTH ==========
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  group_id UUID,
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS permission_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_roles
  ADD CONSTRAINT fk_user_roles_group FOREIGN KEY (group_id) REFERENCES permission_groups(id) ON DELETE SET NULL;

-- ========== MEMBERS ==========
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  cin VARCHAR(50) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(10) DEFAULT 'Homme',
  qr_code VARCHAR(255) NOT NULL,
  photo_url TEXT,
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_members_cin ON members(cin);
CREATE INDEX IF NOT EXISTS idx_members_qr_code ON members(qr_code);
CREATE INDEX IF NOT EXISTS idx_members_full_name ON members(full_name);

-- ========== PLAN CONFIGS ==========
CREATE TABLE IF NOT EXISTS plan_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label VARCHAR(100) NOT NULL,
  months INT NOT NULL,
  price_mad NUMERIC(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Default plans
INSERT INTO plan_configs (label, months, price_mad) VALUES
  ('Mensuel', 1, 300),
  ('Trimestriel', 3, 800),
  ('Annuel', 12, 2800)
ON CONFLICT DO NOTHING;

-- ========== SUBSCRIPTIONS ==========
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  member_name VARCHAR(255),
  plan VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'expired', 'pending')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  amount_mad NUMERIC(10,2) NOT NULL,
  paid_mad NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_member ON subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ========== PAYMENTS ==========
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  member_name VARCHAR(255),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount_mad NUMERIC(10,2) NOT NULL,
  amount_due NUMERIC(10,2) NOT NULL DEFAULT 0,
  method VARCHAR(20) NOT NULL CHECK (method IN ('cash', 'tpe', 'transfer', 'cheque')),
  cheque_number VARCHAR(100),
  invoice_number VARCHAR(50),
  installment_plan VARCHAR(50),
  installment_number INT,
  installment_total INT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_member ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);

-- ========== ACCESS LOGS ==========
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL,
  balance_due_mad NUMERIC(10,2),
  authorized_by UUID,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_logs_member ON access_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON access_logs(timestamp);

-- ========== EXPENSES ==========
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category VARCHAR(100) NOT NULL,
  description TEXT,
  amount_mad NUMERIC(10,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== AUDIT LOGS ==========
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ========== APP SETTINGS ==========
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== TRIGGERS ==========
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['users','members','subscriptions','plan_configs','permission_groups']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at ON %I', t);
    EXECUTE format('CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
  END LOOP;
END;
$$;

-- ========== ADMIN PAR DÉFAUT ==========
-- Mot de passe: 12345@  (bcrypt hash)
INSERT INTO users (email, password_hash, full_name)
VALUES ('admin@admin.com', '$2a$10$Q5kE8xK3mN7YfZk9vR2Lj.4GhX0C6WxqBpK1YxKJnL7zS9N5m2dOe', 'Administrateur')
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role)
SELECT id, 'admin' FROM users WHERE email = 'admin@admin.com'
ON CONFLICT (user_id) DO NOTHING;
