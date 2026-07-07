# Start AEM Importer UI (local import server on port 3001)
Set-Location $PSScriptRoot\..

if (-not (Test-Path "node_modules\@adobe\aem-cli")) {
  Write-Host "Installing dependencies..."
  npm install
}

if (-not (Test-Path "tools\importer\helix-importer-ui\index.html")) {
  Write-Host "Installing AEM Importer UI..."
  node tools/importer/setup-ui.mjs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Starting import server at http://localhost:3001/"
Write-Host "Open: http://localhost:3001/tools/importer/helix-importer-ui/index.html"
npx @adobe/aem-cli import --no-open --stop-other
