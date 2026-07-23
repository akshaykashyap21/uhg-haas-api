# Prompt: Set up UHG JFrog Artifactory for a React (npm) frontend

Copy everything below the line into Cursor (or another agent) when scaffolding or configuring the React frontend that consumes the UHG HAAS backend API.

---

## Prompt (copy from here)

```text
You are configuring npm to use UHG JFrog Artifactory for a React.js frontend SPA that calls our existing Express backend (api-gateway at http://localhost:3000, Swagger at /api/docs).

Mirror the proven backend monorepo JFrog setup. Do NOT invent different registry hosts or repo names unless I explicitly provide new ones from Artifactory admin.

### Corporate registry facts (hardcode these — they are not secrets)

- Artifactory host: centraluhg.jfrog.io
- Virtual npm repo (all public packages + curated cache): glb-npm-vir
  URL: https://centraluhg.jfrog.io/artifactory/api/npm/glb-npm-vir/
- Local npm repo (internal @uhg-haas packages only): glb-npm-loc
  URL: https://centraluhg.jfrog.io/artifactory/api/npm/glb-npm-loc/
- Curation / CoolNPM / DelayNPM: https://curationuhg.jfrog.io
  - Immature package versions (< ~3 days) return 403 — not an auth failure
  - Prefer exact pins + package.json "overrides" for blocked packages
- Internal scope: @uhg-haas (backend shared libs). Frontend typically does NOT publish here unless we create a dedicated UI package later.
- Auth: JFrog identity token via env var JFROG_NPM_TOKEN only (never commit the token)

### What to create in the React app root

1. `.npmrc` with hardcoded host/repos (do NOT use ${JFROG_NPM_REGISTRY_HOST} for host/repo — unset env breaks installs with literal ${...} URLs):

```npmrc
# UHG JFrog — set JFROG_NPM_TOKEN before npm install
# PowerShell: $env:JFROG_NPM_TOKEN = "<identity-token>"

@uhg-haas:registry=https://centraluhg.jfrog.io/artifactory/api/npm/glb-npm-loc/
//centraluhg.jfrog.io/artifactory/api/npm/glb-npm-loc/:_authToken=${JFROG_NPM_TOKEN}
//centraluhg.jfrog.io/artifactory/api/npm/glb-npm-loc/:always-auth=true

registry=https://centraluhg.jfrog.io/artifactory/api/npm/glb-npm-vir/
//centraluhg.jfrog.io/artifactory/api/npm/glb-npm-vir/:_authToken=${JFROG_NPM_TOKEN}
//centraluhg.jfrog.io/artifactory/api/npm/glb-npm-vir/:always-auth=true

engine-strict=true
save-exact=true
```

2. Gitignored secrets file + committed example:
   - `.env.jfrog` or `env/npm.jfrog.env` (gitignored) containing:
     JFROG_NPM_TOKEN=REPLACE_WITH_JFROG_IDENTITY_TOKEN
   - `env/npm.jfrog.env.example` (committed) with the same key and a placeholder

3. Optional PowerShell helper `scripts/load-jfrog-env.ps1` that loads the token into the session:
```powershell
Get-Content env/npm.jfrog.env | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  if ($_ -match '^([^=]+)=(.*)$') { Set-Item -Path "Env:$($matches[1])" -Value $matches[2].Trim() }
}
```

4. `.gitignore` must include the real token file (e.g. `env/npm.jfrog.env`, `.env.jfrog`).

5. README section: how to set token, verify registry, clean install, CoolNPM 403 handling.

### Install workflow (document and verify)

```powershell
. .\scripts\load-jfrog-env.ps1   # or: $env:JFROG_NPM_TOKEN = "<token>"
npm config get registry
# MUST be: https://centraluhg.jfrog.io/artifactory/api/npm/glb-npm-vir/
# MUST NOT contain literal ${JFROG_...}

Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
npm install
```

After install, spot-check `package-lock.json` `resolved` URLs — prefer centraluhg.jfrog.io (Artifactory-mediated). If they point only at registry.npmjs.org, installs bypassed JFrog.

### CoolNPM / DelayNPM (403)

If install fails with "blocked by jfrog packages curation service" / "Package version is 3 days old":
- Pick an older allowed version from curationuhg.jfrog.io
- Pin exact version in package.json
- Use root "overrides" for transitive deps if needed (same approach as the backend API monorepo)

### Frontend ↔ backend (out of scope for registry, but keep consistent)

- Dev API base URL: http://localhost:3000 (api-gateway), not :3001 (auth is internal)
- Auth routes: /api/v1/auth/*
- Docs: http://localhost:3000/api/docs
- Do not put JFrog tokens in Vite/React env exposed to the browser (VITE_*) — JFROG_NPM_TOKEN is install-time only

### Acceptance criteria

- [ ] `.npmrc` matches the backend pattern (hardcoded host, token via ${JFROG_NPM_TOKEN})
- [ ] Token not committed
- [ ] `npm config get registry` returns the glb-npm-vir URL when token env is set
- [ ] `npm install` succeeds through Artifactory (or documents CoolNPM pin if blocked)
- [ ] README documents setup for Windows PowerShell developers

Implement the files now in this React project. Ask only if the Artifactory local/virtual repo names differ from glb-npm-loc / glb-npm-vir.
```

---

## Quick reference (same as backend)

| Purpose | Value |
|--------|--------|
| Host | `centraluhg.jfrog.io` |
| Public / virtual | `glb-npm-vir` |
| Internal / local | `glb-npm-loc` |
| Scope | `@uhg-haas` → local repo |
| Token env | `JFROG_NPM_TOKEN` |
| Curation | https://curationuhg.jfrog.io |

Backend reference implementation: monorepo root `.npmrc` + `env/npm.jfrog.env.example` + `scripts/load-jfrog-env.ps1`.
