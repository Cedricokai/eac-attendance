$ErrorActionPreference='Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$config=Join-Path (Get-Location) '.env.collaboration.local'
if(-not(Test-Path -LiteralPath $config)){throw 'Create .env.collaboration.local with APP_FILES_COLLABORATION_KEY matching the backend.'}
$allowed=@('APP_FILES_COLLABORATION_KEY','EAC_BACKEND_URL','EAC_COLLABORATION_HOST','EAC_COLLABORATION_PORT','EAC_COLLABORATION_ROOT','EAC_COLLABORATION_ORIGINS')
foreach($line in Get-Content -LiteralPath $config){if($line.Trim().StartsWith('#')){continue};$pair=$line.Split('=',2);if($pair.Length -eq 2 -and $allowed -contains $pair[0].Trim()){[Environment]::SetEnvironmentVariable($pair[0].Trim(),$pair[1].Trim(),'Process')}}
node collaboration/server.mjs
exit $LASTEXITCODE
