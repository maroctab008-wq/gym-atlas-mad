-- ============================================
-- Gym Atlas — Script d'initialisation Admin + Staff
-- Exécuter: psql -U postgres -d gym_atlas -f backend/src/db/seed-admin.sql
-- Mot de passe admin: 12345@
-- ============================================

-- 1. S'assurer que l'admin existe avec mot de passe = "12345@"
-- Hash bcrypt de "12345@" :
INSERT INTO users (email, password_hash, full_name, status)
VALUES (
  'admin@admin.com',
  '$2a$10$Q5kE8xK3mN7YfZk9vR2Lj.4GhX0C6WxqBpK1YxKJnL7zS9N5m2dOe',
  'Administrateur',
  'active'
)
  '$2a$10$8K1p/a0dL1LXMIgoEDFrwOexMQhKDySE/INO.UkLfkHFOKQ3qlg8W',
  'Administrateur',
  'active'
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = '$2a$10$8K1p/a0dL1LXMIgoEDFrwOexMQhKDySE/INO.UkLfkHFOKQ3qlg8W',
  status = 'active',
  full_name = 'Administrateur';

-- 2. S'assurer que l'admin a le rôle 'admin'
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin' FROM users WHERE email = 'admin@admin.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- 3. Créer un groupe de permissions par défaut pour le staff
INSERT INTO permission_groups (id, name, permissions)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Staff Standard',
  '{
    "view_dashboard_kpis": false,
    "members_add": true,
    "members_edit": true,
    "members_delete": false,
    "payments_view": true,
    "payments_create": true,
    "payments_delete": false,
    "expenses_view": true,
    "expenses_import": false,
    "access_override": false,
    "settings_access": false
  }'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  name = EXCLUDED.name;

-- 4. Créer un compte staff de test (mot de passe = "staff123")
INSERT INTO users (email, password_hash, full_name, status)
VALUES (
  'staff@gym.com',
  '$2a$10$LZKxYmFQEjXYMzU.u/5Xu.4zPxNJ0W9YNBwMj6GXZQF4dUGvia/q2',
  'Staff Test',
  'active'
)
ON CONFLICT (email) DO UPDATE SET
  status = 'active';

-- 5. Assigner le rôle staff + groupe par défaut au compte staff
INSERT INTO user_roles (user_id, role, group_id)
SELECT id, 'staff', '00000000-0000-0000-0000-000000000001'
FROM users WHERE email = 'staff@gym.com'
ON CONFLICT (user_id) DO UPDATE SET
  role = 'staff',
  group_id = '00000000-0000-0000-0000-000000000001';

-- 6. Vérification
SELECT '--- VÉRIFICATION ---' AS info;
SELECT u.email, u.status, ur.role, pg.name AS groupe
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN permission_groups pg ON pg.id = ur.group_id
WHERE u.email IN ('admin@admin.com', 'staff@gym.com')
ORDER BY ur.role;
