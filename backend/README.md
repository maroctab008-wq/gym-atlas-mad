# 🏋️ GymManager — Backend API (Node.js + Express + PostgreSQL)

Backend complet avec authentification JWT, RBAC, et gestion de salle de sport.

---

## 📋 Prérequis

| Logiciel | Version min. | Lien |
|----------|-------------|------|
| **Node.js** | v18+ | https://nodejs.org |
| **PostgreSQL** | v14+ | https://www.postgresql.org/download |
| **npm** | v9+ | Inclus avec Node.js |

---

## 🚀 Installation pas à pas

### Étape 1 — Cloner et installer

```bash
git clone <URL_DU_REPO>
cd backend
npm install
```

### Étape 2 — Créer la base de données

```bash
psql -U postgres
```
```sql
CREATE DATABASE gym_atlas;
\q
```

### Étape 3 — Configurer l'environnement

```bash
cp .env.example .env
```

Modifier `.env` :
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gym_atlas
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe_postgres

JWT_SECRET=changez_cette_cle_secrete_en_production
JWT_EXPIRES_IN=24h

PORT=3001
```

### Étape 4 — Initialiser les tables + admin

```bash
npm run db:init
```

### Étape 5 — Créer les comptes (admin + staff + permissions)

```bash
psql -U postgres -d gym_atlas -f src/db/seed-admin.sql
```

### Étape 6 — Lancer le serveur

```bash
npm run dev       # Dev (auto-reload)
# ou
npm start         # Production
```

→ **http://localhost:3001**

### Étape 7 — Vérifier

```bash
curl http://localhost:3001/api/health
# {"status":"ok","timestamp":"..."}

curl http://localhost:3001/api/auth/check-admin
# {"exists":true,"ok":true,...}
```

---

## 🔐 Comptes par défaut

| Compte | Email | Mot de passe | Rôle |
|--------|-------|-------------|------|
| **Admin** | `admin@admin.com` | `12345@` | admin |
| **Staff** | `staff@gym.com` | `staff123` | staff |

> ⚠️ **Changez les mots de passe en production !**

---

## 📁 Structure

```
backend/
├── .env.example
├── package.json
└── src/
    ├── server.js                 # Express entry point
    ├── db/
    │   ├── pool.js               # PostgreSQL connection pool
    │   ├── init.js               # DB init script
    │   ├── schema.sql            # Full schema + triggers + admin
    │   └── seed-admin.sql        # Admin + staff + permission groups
    ├── middleware/
    │   ├── auth.js               # JWT auth + RBAC (admin/staff)
    │   └── audit.js              # Action logging
    └── routes/
        ├── auth.js               # Login, profil, permissions, MDP
        ├── members.js            # CRUD membres + import
        ├── subscriptions.js      # CRUD abonnements + anti-doublon
        ├── payments.js           # CRUD paiements + sync abonnement
        ├── plans.js              # Plans d'abonnement (admin)
        ├── expenses.js           # Dépenses
        ├── users.js              # Gestion personnel (admin)
        ├── settings.js           # Paramètres + reset DB
        ├── accessLogs.js         # Logs d'accès portail
        ├── audit.js              # Journal d'audit (admin)
        ├── dashboard.js          # KPIs & statistiques
        └── terminal.js           # Sync terminaux Hikvision
```

---

## 🔌 API Endpoints

### Auth — `/api/auth`
| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| POST | `/login` | Connexion → JWT | ❌ |
| GET | `/me` | Profil connecté | ✅ |
| GET | `/permissions` | Permissions utilisateur | ✅ |
| POST | `/change-password` | Changer son MDP | ✅ |
| POST | `/admin-change-password` | Changer MDP d'un user | ✅ Admin |
| GET | `/check-admin` | Vérifier config admin | ❌ |

### Membres — `/api/members`
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Liste des membres |
| GET | `/:id` | Détail |
| POST | `/` | Créer |
| PUT | `/:id` | Modifier |
| DELETE | `/:id` | Supprimer (si pas d'abo actif) |
| POST | `/import` | Import en masse |
| GET | `/search/:query` | Rechercher |

### Abonnements — `/api/subscriptions`
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Liste |
| GET | `/:id` | Détail |
| POST | `/` | Créer (anti-doublon) |
| PUT | `/:id` | Modifier |
| DELETE | `/:id` | Supprimer |
| GET | `/by-member/:id` | Par membre |

### Paiements — `/api/payments`
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Liste |
| POST | `/` | Créer (auto-sync abo) |
| PUT | `/:id` | Modifier |
| DELETE | `/:id` | Supprimer |
| GET | `/members-with-subs` | Dropdown membres |
| GET | `/next-invoice` | N° facture suivant |

### Plans — `/api/plans` *(Admin)*
| GET | `/` | Liste | POST | `/` | Créer |
| PUT | `/:id` | Modifier | DELETE | `/:id` | Supprimer |

### Utilisateurs — `/api/users` *(Admin)*
| GET | `/` | Personnel | GET | `/groups` | Groupes permissions |
| POST | `/` | Créer | PUT | `/:id/group` | Changer groupe |
| PUT | `/:id/status` | Activer/Désactiver | PUT | `/:id/password` | MDP |
| DELETE | `/:id` | Supprimer |

### Dépenses — `/api/expenses`
| GET | `/` | Liste | POST | `/` | Créer | DELETE | `/:id` | Supprimer |

### Paramètres — `/api/settings`
| GET | `/` | Tous | PUT | `/:key` | Modifier *(Admin)* |
| POST | `/reset-database` | Réinitialiser *(Admin)* |

### Dashboard — `/api/dashboard`
| GET | `/stats` | KPIs | GET | `/recent-payments` | Récents |
| GET | `/expiring-subscriptions` | Expirations proches |

### Accès — `/api/access-logs`
| GET | `/` | Historique | POST | `/` | Scanner |

### Audit — `/api/audit` *(Admin)*
| GET | `/` | Journal d'audit |

### Terminal — `/api/terminal`
| GET | `/sync-members` | Membres | POST | `/test-connection` | Tester |
| POST | `/sync` | Synchroniser |

---

## 🔒 Authentification & Sécurité

- **JWT** : Token dans header `Authorization: Bearer <token>`
- **RBAC** : Rôles `admin` et `staff`
- **11 permissions granulaires** par groupe de permissions
- **Audit log** automatique sur chaque action CRUD

### Permissions disponibles
| Permission | Description |
|-----------|-------------|
| `view_dashboard_kpis` | KPIs financiers |
| `members_add` / `edit` / `delete` | Gestion membres |
| `payments_view` / `create` / `delete` | Gestion paiements |
| `expenses_view` / `import` | Gestion dépenses |
| `access_override` | Forcer portail |
| `settings_access` | Paramètres |

---

## 🔧 Connecter le Frontend (mode local)

Pour que le frontend React pointe vers ce backend local, créez un fichier `src/lib/api-local.ts` :

```typescript
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:3001/api',
});

API.interceptors.request.use(config => {
  const token = localStorage.getItem('gym_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const api = {
  get: (path: string) => API.get(path).then(r => ({ data: r.data, error: null })).catch(e => ({ data: null, error: e.response?.data?.error || e.message })),
  post: (path: string, body?: any) => API.post(path, body).then(r => ({ data: r.data, error: null })).catch(e => ({ data: null, error: e.response?.data?.error || e.message })),
  put: (path: string, body?: any) => API.put(path, body).then(r => ({ data: r.data, error: null })).catch(e => ({ data: null, error: e.response?.data?.error || e.message })),
  patch: (path: string, body?: any) => API.patch(path, body).then(r => ({ data: r.data, error: null })).catch(e => ({ data: null, error: e.response?.data?.error || e.message })),
  delete: (path: string) => API.delete(path).then(r => ({ data: r.data, error: null })).catch(e => ({ data: null, error: e.response?.data?.error || e.message })),
};

export function setToken(token: string) { localStorage.setItem('gym_token', token); }
export function clearToken() { localStorage.removeItem('gym_token'); }
```

---

## 🛡️ Checklist production

- [ ] Changer tous les mots de passe par défaut
- [ ] `JWT_SECRET` fort (32+ caractères aléatoires)
- [ ] HTTPS via reverse proxy (nginx / Caddy)
- [ ] Pare-feu PostgreSQL (port 5432)
- [ ] `npm install helmet express-rate-limit`
- [ ] Sauvegardes PostgreSQL automatiques

---

**Développé par MediaTechnology.ma**
