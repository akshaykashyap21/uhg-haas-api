# UHG HAAS API

Gateway + auth service on Azure SQL / SQL Server. TypeORM, JWT, Joi.

```
Client → api-gateway (:3000) → auth-service (:3001) → SQL Server
```

## Quick start

```bash
npm install
npm run build:shared
npm run dev:all
```

Env files live per service:

- `services/auth-service/.env`
- `services/api-gateway/.env`

### Local SQL Server (Windows Authentication)

1. Install SQL Server Express or Developer.
2. Create the database:
   ```sql
   CREATE DATABASE uhg;
   ```
3. In `services/auth-service/.env`:
   ```env
   AZURE_SQL_HOST=localhost
   AZURE_SQL_DATABASE=uhg
   AZURE_SQL_WINDOWS_AUTH=true
   AZURE_SQL_TRUST_SERVER_CERTIFICATE=true
   TYPEORM_SYNC=false
   ```
   For Express: `AZURE_SQL_HOST=localhost\\SQLEXPRESS`

Requires ODBC Driver 17 and `msnodesqlv8`. Create DB once with `npm run db:create:local`, then apply scripts under `db/auth/`.

### Environments

| `APP_ENV` | File | Notes |
|-----------|------|-------|
| `development` | `.env` | Local SQL |
| `staging` | `.env.staging` | Azure SQL staging |
| `production` | `.env.production` | Azure SQL prod |

```bash
npm run start:auth:staging
npm run start:gateway:staging
```

## JFrog Artifactory (npm)

- Virtual repo: `glb-npm-vir` on `centraluhg.jfrog.io`
- Local scope `@uhg-haas`: `glb-npm-loc`
- Set `JFROG_NPM_TOKEN` before install (see `env/npm.jfrog.env.example`)

```powershell
. .\scripts\load-jfrog-env.ps1
npm config get registry
npm install
```

CoolNPM/DelayNPM 403s mean the package version is too new — pin an older version or use `overrides` (see root `package.json`).

```bash
npm run version:bump:patch
npm run publish:shared
```

## Docs

| Doc | Contents |
|-----|----------|
| [docs/SETUP.md](docs/SETUP.md) | **Full setup with JFrog + run steps** |
| [docs/WORKFLOW-AND-DB-FIRST.md](docs/WORKFLOW-AND-DB-FIRST.md) | Workflow + DB-first mapping |
| [db/README.md](db/README.md) | SQL scripts |
| [docs/JFROG-REACT-FRONTEND-PROMPT.md](docs/JFROG-REACT-FRONTEND-PROMPT.md) | JFrog setup for React |

## API

Swagger: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/v1/auth/register` | — |
| POST | `/api/v1/auth/login` | — |
| POST | `/api/v1/auth/refresh` | — |
| POST | `/api/v1/auth/logout` | — |
| GET | `/api/v1/auth/me` | Bearer |
| POST | `/api/v1/auth/change-password` | Bearer |

## Production

1. `TYPEORM_SYNC=false`; use SQL scripts / migrations.
2. Store secrets in Key Vault / App Settings.
3. Keep `AZURE_SQL_ENCRYPT=true`.
