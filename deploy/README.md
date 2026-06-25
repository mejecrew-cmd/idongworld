# IdongWorld Production Deploy

This folder contains the production-oriented Docker deployment for the frontend, backend, and MongoDB.

## 1. Create environment file

Copy the template:

```bash
cp deploy/env/.env.production.example .env.production
```

Generate strong secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Set these values in `.env.production`:

- `AUTH_PASSWORD_SECRET`
- `SESSION_SECRET`
- `MONGO_ROOT_PASSWORD`
- `FRONTEND_ORIGIN`
- `VITE_API_URL`
- Firebase Admin values for backend social login token verification
- Firebase web values for frontend social login

Do not commit `.env.production`.

## 2. Build and run

```bash
docker compose -f docker-compose.production.yml --env-file .env.production up --build -d
```

Default ports:

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:4000`

## 3. Health check

```bash
curl http://localhost:4000/health
```

Expected production-sensitive settings:

- `auth.firebaseAuthRequired: true`
- `auth.firebaseAdminEnabled: true`
- `migration.repositories.backend: "mongo"`

## Notes

- ID/password accounts are stored in MongoDB with PBKDF2 password hashes.
- Password-login sessions use `AUTH_PASSWORD_SECRET` for token signatures.
- Social login still uses Firebase.
- `ALLOWED_ORIGINS` is populated from `FRONTEND_ORIGIN` in Docker Compose.
