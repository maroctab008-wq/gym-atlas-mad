# Gym Atlas - Backend API

Backend Node.js/Express + PostgreSQL pour le projet Gym Atlas.

## Prérequis

- **Node.js** >= 18
- **PostgreSQL** >= 14

## Installation

```bash
cd backend
npm install
```

## Configuration

Copier `.env.example` vers `.env` et configurer :

```bash
cp .env.example .env
```

Modifier les valeurs PostgreSQL et le JWT_SECRET.

## Initialiser la base de données

```bash
# Créer la base
createdb gym_atlas

# Exécuter le schéma
npm run db:init
```

## Lancer le serveur

```bash
# Mode développement (hot reload)
npm run dev

# Mode production
npm start
```

Le serveur démarre sur `http://localhost:3001`

## Compte admin par défaut

- **Email** : `admin@admin.com`
- **Mot de passe** : `12345@@?`

## API Endpoints

### Auth
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/login` | Connexion (retourne JWT) |
| GET | `/api/auth/me` | Profil utilisateur connecté |
| POST | `/api/auth/change-password` | Changer son mot de passe |
| POST | `/api/auth/admin-change-password` | Changer le MDP d'un autre (admin) |

### Membres
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/members` | Liste des membres |
| GET | `/api/members/:id` | Détail d'un membre |
| POST | `/api/members` | Créer un membre |
| PUT | `/api/members/:id` | Modifier un membre |
| DELETE | `/api/members/:id` | Supprimer (si pas d'abonnement actif) |
| GET | `/api/members/search/:query` | Recherche |

### Abonnements
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/subscriptions` | Liste |
| POST | `/api/subscriptions` | Créer (anti-doublon intégré) |
| PUT | `/api/subscriptions/:id` | Modifier |
| DELETE | `/api/subscriptions/:id` | Supprimer |
| GET | `/api/subscriptions/member/:id` | Par membre |

### Paiements
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/payments` | Liste |
| POST | `/api/payments` | Créer (sync auto abonnement) |
| PUT | `/api/payments/:id` | Modifier |
| DELETE | `/api/payments/:id` | Supprimer |
| GET | `/api/payments/next-invoice` | Prochain n° facture |

### Plans
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/plans` | Liste des plans |
| POST | `/api/plans` | Créer (admin) |
| PUT | `/api/plans/:id` | Modifier (admin) |
| DELETE | `/api/plans/:id` | Supprimer (admin) |

### Dashboard
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/dashboard/stats` | Statistiques |
| GET | `/api/dashboard/recent-payments` | Paiements récents |
| GET | `/api/dashboard/expiring-subscriptions` | Abonnements expirant |

### Terminal Hikvision
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/terminal/test-connection` | Tester connexion |
| POST | `/api/terminal/sync` | Synchroniser membres |

### Autres
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/access-logs` | Journaux d'accès |
| POST | `/api/access-logs` | Enregistrer un accès |
| GET | `/api/expenses` | Dépenses |
| POST | `/api/expenses` | Ajouter dépense |
| GET | `/api/audit` | Journaux d'audit (admin) |
| GET | `/api/users` | Liste utilisateurs (admin) |
| POST | `/api/users` | Créer utilisateur (admin) |

## Headers d'authentification

Toutes les routes protégées nécessitent :
```
Authorization: Bearer <jwt_token>
```
