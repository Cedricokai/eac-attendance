param([switch]$Install)
$ErrorActionPreference='Stop'
Set-Location -LiteralPath $PSScriptRoot
if($Install -or -not(Test-Path -LiteralPath 'node_modules')){npm ci;if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}}
Write-Host 'EAC frontend: http://localhost:5173/#/ (backend must be running on port 8080).'
npm run dev -- --host 127.0.0.1
exit $LASTEXITCODE
