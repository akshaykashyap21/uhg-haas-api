# Loads env/npm.jfrog.env into the current PowerShell session.
# Usage (from repo root):
#   . .\scripts\load-jfrog-env.ps1
#   npm config get registry
#   npm install

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root 'env\npm.jfrog.env'

if (-not (Test-Path $envFile)) {
  Write-Error "Missing $envFile — copy env\npm.jfrog.env.example and set JFROG_NPM_TOKEN."
}

Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  if ($_ -match '^([^=]+)=(.*)$') {
    Set-Item -Path "Env:$($matches[1])" -Value $matches[2].Trim()
  }
}

if (-not $env:JFROG_NPM_TOKEN -or $env:JFROG_NPM_TOKEN -match 'REPLACE_WITH') {
  Write-Warning "JFROG_NPM_TOKEN looks unset or still a placeholder — npm install will 401."
}

Write-Host "JFROG_NPM_TOKEN set: $([bool]$env:JFROG_NPM_TOKEN)"
Write-Host "Run: npm config get registry"
Write-Host "Expected: https://centraluhg.jfrog.io/artifactory/api/npm/glb-npm-vir/"
