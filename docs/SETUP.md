# Setup guide — UHG HAAS API

End-to-end steps to install (via **UHG JFrog Artifactory**) and run the API locally.

```
Client → api-gateway (:3000) → auth-service (:3002) → SQL Server
```

---

## Requirements

| Tool | Notes |
|------|--------|
| Node.js | ≥ 20 |
| npm | ≥ 10 |
| JFrog identity token | Access to `centraluhg.jfrog.io` |
| SQL Server | Express / Developer / Azure SQL |
| ODBC Driver 17 | Required for Windows Authentication + `msnodesqlv8` |

---

## 1. Clone and open the repo

```powershell
cd <path-to-repo>
```

---

## 2. Configure JFrog (npm)

Host and repos are already set in root `.npmrc`:

- Public packages → `glb-npm-vir`
- Scope `@uhg-haas` → `glb-npm-loc`

### 2.1 Create the token file

```powershell
Copy-Item env\npm.jfrog.env.example env\npm.jfrog.env
```

Edit `env\npm.jfrog.env` and set your real token:

```env
JFROG_NPM_TOKEN=<your-jfrog-identity-token>
```

Do **not** commit `env/npm.jfrog.env` (it is gitignored).

### 2.2 Load the token into the shell

Run this in **every new PowerShell session** before `npm install`:

```powershell
. .\scripts\load-jfrog-env.ps1
```

Or:

```powershell
$env:JFROG_NPM_TOKEN = "<your-jfrog-identity-token>"
```

### 2.3 Confirm registry

```powershell
npm config get registry
```

Expected:

```text
https://centraluhg.jfrog.io/artifactory/api/npm/glb-npm-vir/
```

If you see `${JFROG_...}` in the URL, the token env var is not loaded.

---

## 3. Install dependencies

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
npm install
```

### If install fails with 403 (CoolNPM / DelayNPM)

UHG blocks very new npm package versions. That is **not** an auth error.

- Pick an older allowed version in [JFrog Curation](https://curationuhg.jfrog.io)
- Pin it in `package.json` or add it to root `overrides`

### If you see `Cannot find module '@uhg-haas/shared'`

```powershell
npm run build:shared
node scripts/ensure-shared-in-node-modules.mjs
```

---

## 4. Configure service environment

Per-service env files (already present for local/dev):

| Service | File |
|---------|------|
| API gateway | `services/api-gateway/.env` |
| Auth service | `services/auth-service/.env` |

### Gateway (`services/api-gateway/.env`)

```env
PORT=3000
AUTH_SERVICE_URL=http://localhost:3002
```

### Auth (`services/auth-service/.env`)

```env
PORT=3002
AZURE_SQL_HOST=localhost\SQLEXPRESS
AZURE_SQL_DATABASE=uhg
AZURE_SQL_WINDOWS_AUTH=true
AZURE_SQL_ENCRYPT=true
AZURE_SQL_TRUST_SERVER_CERTIFICATE=true
TYPEORM_SYNC=false
```

Adjust host/database to match your machine (named instance, Azure SQL, etc.).  
Keep **gateway `AUTH_SERVICE_URL` port** in sync with **auth `PORT`**.

---

## 5. Prepare the database (DB-first)

1. Ensure SQL Server is running.
2. Create the database (if needed):

   ```powershell
   npm run db:create:local
   ```

   Or in SSMS:

   ```sql
   CREATE DATABASE uhg;
   ```

3. Apply schema scripts in order:

   - `db/auth/001_create_users.sql`
   - `db/auth/002_create_refresh_tokens.sql`

4. Keep `TYPEORM_SYNC=false` so the app does not alter schema.

More detail: [docs/WORKFLOW-AND-DB-FIRST.md](docs/WORKFLOW-AND-DB-FIRST.md)

---

## 6. Build and run

```powershell
npm run build:shared
npm run dev:all
```

This builds `@uhg-haas/shared`, ensures it is linked in `node_modules`, and starts:

- **Gateway** → http://localhost:3000  
- **Auth** → http://localhost:3002  

---

## 7. Verify

| Check | URL |
|-------|-----|
| Swagger UI | http://localhost:3000/api/docs |
| Gateway health | http://localhost:3000/health |
| Gateway ready | http://localhost:3000/ready |
| Auth ready | http://localhost:3002/api/v1/auth/ready |

Example login (via gateway):

```powershell
curl -X POST http://localhost:3000/api/v1/auth/register `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"dev@example.com\",\"password\":\"Str0ng!Pass\",\"firstName\":\"Dev\",\"lastName\":\"User\"}"
```

---

## Everyday use (after first setup)

```powershell
cd <path-to-repo>
npm run dev:all
```

Reload the JFrog token only when you need to install or publish again:

```powershell
. .\scripts\load-jfrog-env.ps1
npm install
```

---

## Staging / production

```powershell
npm run start:auth:staging
npm run start:gateway:staging

npm run start:auth:prod
npm run start:gateway:prod
```

Use `services/<service>/.env.staging` or `.env.production`. Prefer Key Vault / App Settings for secrets.

---

## Optional: publish `@uhg-haas/shared` to JFrog

```powershell
. .\scripts\load-jfrog-env.ps1
npm run version:bump:patch
npm run publish:shared
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `401` / incorrect password on npm install | Set a valid `JFROG_NPM_TOKEN` and reload the shell |
| Registry URL contains `${JFROG_...}` | Run `. .\scripts\load-jfrog-env.ps1` again |
| `Cannot find module '@uhg-haas/shared'` | `npm run build:shared` then `node scripts/ensure-shared-in-node-modules.mjs` |
| Gateway ready shows auth down | Confirm auth is on the port in `AUTH_SERVICE_URL`; check SQL connectivity |
| HTML 404 on auth port | Another process owns that port — `netstat -ano \| findstr :3002` and stop it |
| Windows auth login fails | Install ODBC Driver 17; confirm `msnodesqlv8` installed; use correct instance name |

---

## Related docs

| File | Purpose |
|------|---------|
| [README.md](README.md) | Project overview |
| [docs/WORKFLOW-AND-DB-FIRST.md](docs/WORKFLOW-AND-DB-FIRST.md) | Architecture + DB-first |
| [docs/JFROG-REACT-FRONTEND-PROMPT.md](docs/JFROG-REACT-FRONTEND-PROMPT.md) | JFrog for React frontend |
| [db/README.md](db/README.md) | SQL script layout |
