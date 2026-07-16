# Database scripts (DB-first)

SQL Server is the source of truth. Apply scripts here **before** updating TypeORM entities.

See [WORKFLOW-AND-DB-FIRST.md](../docs/WORKFLOW-AND-DB-FIRST.md) for the full workflow.

## Auth service

| Script | Purpose |
|--------|---------|
| `auth/001_create_users.sql` | `dbo.users` |
| `auth/002_create_refresh_tokens.sql` | `dbo.refresh_tokens` |

Apply in numeric order against database `uhg` (SSMS or `sqlcmd`).
