# UHG HAAS API — Workflow & DB-First Guide

This document explains how the monorepo works end-to-end, and how we follow a **database-first** approach: **SQL Server owns the schema**; Node/TypeORM only maps to existing tables.

---

## 1. Big picture

```
Client / Swagger UI
        │
        ▼
┌───────────────────┐
│   api-gateway     │  :3000   public edge, proxy, /api/docs
│  (Express)        │
└─────────┬─────────┘
          │ HTTP proxy
          ▼
┌───────────────────┐
│   auth-service    │  :3002   register / login / refresh / me
│  (Express + JWT)  │
└─────────┬─────────┘
          │ TypeORM
          ▼
┌───────────────────┐
│  Azure SQL /      │  database: uhg (local or cloud)
│  SQL Server       │
└───────────────────┘
```

| Piece | Role |
|--------|------|
| `services/api-gateway` | Single public entry; proxies `/api/auth/*` → auth-service |
| `services/auth-service` | Auth business logic + DB access |
| `packages/shared` | JWT, Joi helpers, logging, middleware, SQL connection builder |
| `services/*/ .env` | Per-service config (ports, SQL, JWT) |

**Local start**

```bash
npm run build:shared
npm run db:create:local    # once — creates uhg DB (Windows auth)
npm run dev:all            # gateway :3000 + auth :3002
```

Docs UI: `http://localhost:3000/api/docs`

---

## 2. Request workflow (auth example)

1. Client calls `POST http://localhost:3000/api/auth/login`
2. Gateway forwards to `http://localhost:3002/api/auth/login`
3. `auth-service` validates body with Joi
4. `AuthService` uses TypeORM repositories (`User`, `RefreshToken`)
5. SQL runs against tables that **already exist** in the database
6. JWT access + refresh tokens returned through the gateway

```
HTTP → Gateway → AuthController → AuthService → TypeORM Repository → SQL table
```

---

## 3. Code-first vs DB-first (what we use)

| Approach | Who owns schema? | Typical tool | Our policy |
|----------|------------------|--------------|------------|
| **Code-first** | TypeORM entities + `synchronize: true` | Auto `CREATE TABLE` | **Dev-only shortcut — do not use for real work** |
| **DB-first** | SQL scripts / SSMS / DBA | Tables first, then entities | **Required** |

Today the repo still has `TYPEORM_SYNC=true` in local `.env` as a bootstrap aid. For DB-first:

```env
TYPEORM_SYNC=false
```

Never enable sync in staging/production.

---

## 4. DB-first workflow (step by step)

### Step A — Design & create tables in SQL Server

Use SSMS, Azure Data Studio, or `.sql` scripts under `db/` (recommended location).

Example auth schema (align names with entities):

```sql
-- db/auth/001_create_users.sql
USE uhg;
GO

IF OBJECT_ID(N'dbo.users', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.users (
    id            UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_users PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    email         NVARCHAR(255)    NOT NULL,
    password_hash NVARCHAR(255)    NOT NULL,
    first_name    NVARCHAR(100)    NOT NULL,
    last_name     NVARCHAR(100)    NOT NULL,
    role          NVARCHAR(50)     NOT NULL CONSTRAINT DF_users_role DEFAULT (N'USER'),
    is_active     BIT              NOT NULL CONSTRAINT DF_users_is_active DEFAULT (1),
    last_login_at DATETIME2        NULL,
    created_at    DATETIME2        NOT NULL CONSTRAINT DF_users_created DEFAULT (SYSUTCDATETIME()),
    updated_at    DATETIME2        NOT NULL CONSTRAINT DF_users_updated DEFAULT (SYSUTCDATETIME())
  );

  CREATE UNIQUE INDEX UX_users_email ON dbo.users(email);
END
GO
```

```sql
-- db/auth/002_create_refresh_tokens.sql
USE uhg;
GO

IF OBJECT_ID(N'dbo.refresh_tokens', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.refresh_tokens (
    id          UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_refresh_tokens PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    jti         NVARCHAR(100)    NOT NULL,
    user_id     UNIQUEIDENTIFIER NOT NULL,
    expires_at  DATETIME2        NOT NULL,
    revoked_at  DATETIME2        NULL,
    created_at  DATETIME2        NOT NULL CONSTRAINT DF_rt_created DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_refresh_tokens_user
      FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
  );

  CREATE UNIQUE INDEX UX_refresh_tokens_jti ON dbo.refresh_tokens(jti);
END
GO
```

Run in order (or add to a release script). **Schema changes always start here**, not in TypeScript.

### Step B — Map each table to a TypeORM entity in Node

Put entities in the owning service, e.g.:

```
services/auth-service/src/entities/
  User.ts
  RefreshToken.ts
```

Rules that keep DB-first honest:

| Rule | Why |
|------|-----|
| `@Entity({ name: 'exact_table_name' })` | Must match SQL table |
| `@Column({ name: 'snake_case' })` | Must match SQL column |
| Correct `type` (`nvarchar`, `bit`, `datetime2`, `uniqueidentifier`) | Avoid silent cast bugs |
| Relations use real FK columns (`@JoinColumn({ name: 'user_id' })`) | Matches SQL FK |
| No `synchronize: true` | DB must not be altered by the app |

Example (already in the repo for `users`):

```ts
@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'nvarchar', length: 255 })
  email!: string;

  @Column({ name: 'password_hash', type: 'nvarchar', length: 255 })
  passwordHash!: string;
  // ...
}
```

Property names can be camelCase in TypeScript; **column names** must match the database via `name:`.

### Step C — Register entities on the DataSource

Every mapped table must be listed when creating the DataSource:

```ts
// services/auth-service/src/config/data-source.ts
import { User } from '../entities/User';
import { RefreshToken } from '../entities/RefreshToken';

export const AppDataSource = new DataSource(
  buildDataSourceOptions(env, [User, RefreshToken]),
);
```

If you add `dbo.claims`, create `Claim.ts` and add `Claim` to this array. **Unregistered tables are invisible to TypeORM.**

### Step D — Use repositories in services

```ts
this.userRepo = AppDataSource.getRepository(User);

const user = await this.userRepo.findOne({ where: { email } });
await this.userRepo.save(user);
```

Or query builder / raw SQL when needed:

```ts
await AppDataSource.query('SELECT TOP 1 * FROM dbo.users WHERE email = @0', [email]);
```

Prefer repositories for normal CRUD; use raw SQL for reporting / complex joins owned by the DB.

### Step E — Turn sync off

In `services/auth-service/.env`:

```env
TYPEORM_SYNC=false
TYPEORM_LOGGING=true   # helpful while validating mappings
```

Restart auth-service. If a column/table name is wrong, TypeORM will error at query time — fix the entity, not the live DB from code.

---

## 5. Linking *all* tables from an existing database

When the DBA already created many tables, generate or hand-write entities for each one you need in that service.

### Option 1 — Manual (best for a few tables)

1. In SSMS: `Script Table as → CREATE` (or inspect columns)
2. Create `entities/TableName.ts`
3. Register in `data-source.ts`
4. Smoke-test: `AppDataSource.getRepository(Entity).find({ take: 1 })`

### Option 2 — Generate entities from SQL Server (many tables)

Use a generator against the live DB, then **review** the output (generators are imperfect).

```bash
# From repo root (example tool)
npx typeorm-model-generator ^
  -h localhost ^
  -d uhg ^
  -e mssql ^
  -o services/auth-service/src/entities-generated ^
  -s dbo
```

For Windows Authentication you may need a SQL login for the generator, or generate from a machine that can use your preferred connection string.

After generation:

1. Move only the tables this service owns into `src/entities/`
2. Fix types (`bit` → boolean, `uniqueidentifier` → uuid, etc.)
3. Delete unused generated files
4. Register keepers in `data-source.ts`
5. Confirm `TYPEORM_SYNC=false`

### Option 3 — One DataSource, selective entities

You do **not** need an entity for every table in `uhg`. Only map tables the service reads/writes.

| Service | Maps |
|---------|------|
| auth-service | `users`, `refresh_tokens`, … |
| future billing-service | billing tables only |

Shared reference data can live in `packages/shared` only if **two services truly share the same mapping** — prefer duplication of thin entities over a giant shared schema package.

---

## 6. Checklist: “Is this table linked in Node?”

- [ ] Table exists in SQL (`uhg.dbo.<name>`)
- [ ] Entity file exists with matching `@Entity({ name })` and columns
- [ ] Entity imported into `AppDataSource` entities array
- [ ] `TYPEORM_SYNC=false`
- [ ] Service uses `getRepository(Entity)` or QueryBuilder
- [ ] Local smoke test (find/save) succeeds
- [ ] SQL change script committed under `db/` for the next environment

---

## 7. Environment notes (local SQL)

Windows Authentication (no SQL password):

```env
AZURE_SQL_HOST=localhost
AZURE_SQL_DATABASE=uhg
AZURE_SQL_WINDOWS_AUTH=true
AZURE_SQL_TRUST_SERVER_CERTIFICATE=true
TYPEORM_SYNC=false
```

Express instance:

```env
AZURE_SQL_HOST=localhost\SQLEXPRESS
```

Create DB once: `npm run db:create:local`

Staging/production: SQL auth or managed identity against Azure SQL; still **DB-first** (migrations/scripts applied by release pipeline, not TypeORM sync).

---

## 8. Suggested folder layout for SQL scripts

```
db/
  auth/
    001_create_users.sql
    002_create_refresh_tokens.sql
    003_alter_users_add_phone.sql
  README.md          # how to apply scripts per environment
```

Apply order = numeric prefix. Never “fix” production tables from Node.

---

## 9. Day-to-day change flow (team)

```
1. Agree column change with DBA / write SQL script in db/
2. Apply script to local uhg
3. Update or add TypeORM entity + register on DataSource
4. Update Joi validation / service code
5. Test via gateway Swagger
6. Same SQL script goes to staging → production via release process
```

**Wrong order:** change entity → rely on `synchronize` → surprise DROP/ALTER in shared DB.

---

## 10. Quick map of current auth tables

| SQL table | Entity | Registered? |
|-----------|--------|-------------|
| `dbo.users` | `User` | Yes |
| `dbo.refresh_tokens` | `RefreshToken` | Yes |

To add more tables, repeat sections 4–6 for each table.

---

## Related files

| File | Purpose |
|------|---------|
| `services/auth-service/src/config/data-source.ts` | Entity registration |
| `services/auth-service/src/entities/*` | Table mappings |
| `packages/shared/src/config/database.ts` | Connection options (`TYPEORM_SYNC`, Windows auth) |
| `services/auth-service/.env` | Local SQL + sync flag |
| `README.md` | Quick start, JFrog, Windows auth |
