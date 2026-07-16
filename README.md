# Azure Express API {Microservices Architecture}

Gateway + Auth microservice on Azure SQL. TypeORM, JWT, Joi — nothing else pretended to be needed.

```
Client → api-gateway (:3000) → auth-service (:3001) → Azure SQL / SQL Server
```

## Why this shape

| Keep | Dropped (and why) |
|------|-------------------|
| Gateway for a single public edge | User microservice with a second DB — no producer/consumer, pure ceremony |
| JWT access + refresh rotation | Account lockout columns — rate limit covers abuse for now |
| TypeORM + one database | Bicep P1v3 / Key Vault / App Insights stubs — add when you deploy for real |
| Joi on write endpoints | Client-chosen roles on register — privilege escalation waiting to happen |

Add a second service when you have a **real** bounded context (billing, claims, etc.), not a mirrored `users` table.

## Quick start

```bash
npm install

# Env files in env/ folder (see env/auth-service.development.env)

npm run build:shared
npm run dev:all
```

### Local SQL Server (Windows Authentication)

No Docker required. Uses your Windows login to connect to local SQL Server.

1. Install **SQL Server Express** or **Developer**.
2. Create database in SSMS:
   ```sql
   CREATE DATABASE uhg;
   ```
3. Configure `env/auth-service.development.env`:
   ```env
   AZURE_SQL_HOST=localhost
   AZURE_SQL_DATABASE=uhg
   AZURE_SQL_WINDOWS_AUTH=true
   AZURE_SQL_TRUST_SERVER_CERTIFICATE=true
   ```
   For Express: `AZURE_SQL_HOST=localhost\\SQLEXPRESS`

### Environments

| `APP_ENV` | File loaded | Typical use |
|-----------|-------------|-------------|
| `development` (default) | `.env` | Docker SQL, debug logs, TypeORM sync |
| `staging` | `.env.staging` | Azure SQL staging, sync off |
| `production` | `.env.production` | Azure SQL prod, sync off, warn logs |

```bash
npm run start:auth:staging
npm run start:gateway:staging
npm run start:auth:prod
npm run start:gateway:prod
```

Replace `REPLACE_*` values in staging/production (prefer Key Vault / App Settings for secrets).

## JFrog Artifactory (npm)

Packages use scope **`@uhg-haas`** and SemVer (`1.0.0`). Installs go through **`glb-npm-vir`** on `centraluhg.jfrog.io`.

### Setup

```powershell
$env:JFROG_NPM_REGISTRY_HOST = "centraluhg.jfrog.io"
$env:JFROG_NPM_VIRTUAL_REPO = "glb-npm-vir"
$env:JFROG_NPM_LOCAL_REPO = "glb-npm-loc"   # confirm name with your Artifactory admin
$env:JFROG_NPM_TOKEN = "<identity-token>"

Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
npm install
```

### JFrog CoolNPM / DelayNPM (403 on install)

If you see `blocked by jfrog packages curation service` / `Package version is 3 days old`:

- This is **not** an auth failure — UHG policy blocks immature npm versions.
- Root `package.json` uses **`overrides`** and exact pins (`typeorm@0.3.20`, older `@azure/*`) to stay within policy.
- If a package is still blocked, pick an older version in [JFrog Curation](https://curationuhg.jfrog.io) and add it to `overrides`.

### Versioning & publish

All workspace packages stay on the **same version** (JFrog expects exact SemVer on internal deps):

```bash
npm run version:bump:patch   # 1.0.0 → 1.0.1 across root + workspaces
npm run publish:shared       # publishes @uhg-haas/shared to JFrog npm-local
```

Docker builds need the same `JFROG_*` build args (see `Dockerfile`).

## API documentation

Interactive Swagger UI (OpenAPI 3) is served from the gateway:

- UI: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- Spec: [http://localhost:3000/api/docs/openapi.json](http://localhost:3000/api/docs/openapi.json)

Use **Authorize** in Swagger with the `accessToken` from login/register to try protected routes.

## Auth API (`/api/v1/auth`)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/register` | — | Always creates `USER` |
| POST | `/login` | — | Returns access + refresh tokens |
| POST | `/refresh` | — | Rotates refresh; reuse revokes all |
| POST | `/logout` | — | Revokes refresh token |
| GET | `/me` | Bearer | Current user |
| POST | `/change-password` | Bearer | Revokes all refresh tokens |

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"a@b.com\",\"password\":\"Str0ng!Pass\"}"
```

## Production notes

1. `TYPEORM_SYNC=false` in prod; introduce migrations when the schema stabilizes.
2. Put `JWT_SECRET` and SQL creds in Key Vault / App Settings — not in git.
3. `AZURE_SQL_ENCRYPT=true`; prefer private endpoint over wide firewall rules.
4. Front the gateway with Front Door / App Gateway + WAF when public.
