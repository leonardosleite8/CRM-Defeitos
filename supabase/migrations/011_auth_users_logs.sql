-- Auth local (usuários + logs de auditoria)

CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS app_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_app_audit_logs_created ON app_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users (email);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_users_all" ON app_users;
CREATE POLICY "app_users_all" ON app_users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "app_audit_logs_all" ON app_audit_logs;
CREATE POLICY "app_audit_logs_all" ON app_audit_logs FOR ALL USING (true) WITH CHECK (true);

-- O primeiro admin (leonardo@urano.com.br / admin123) é criado automaticamente
-- na primeira abertura da tela de login se a tabela estiver vazia.
