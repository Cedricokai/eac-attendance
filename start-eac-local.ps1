param([string]$BackendPath=(Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'eac-attendance-backend'))
$ErrorActionPreference='Stop'
$BackendPath=[IO.Path]::GetFullPath($BackendPath)
if(-not(Test-Path -LiteralPath (Join-Path $BackendPath 'run-local.ps1'))){throw 'Pass -BackendPath with your eac-attendance-backend folder.'}
$shell=(Get-Process -Id $PID).Path
# Background services write logs into their own projects. No visible helper windows.
foreach($job in @(@{Name='Backend';Root=$BackendPath;Script='run-local.ps1';Port=8080},@{Name='Frontend';Root=$PSScriptRoot;Script='run-local.ps1';Port=5173},@{Name='Collaboration';Root=$PSScriptRoot;Script='collaboration\run-local.ps1';Port=1234})){
 $client=New-Object Net.Sockets.TcpClient
 try{$connected=$client.ConnectAsync('127.0.0.1',$job.Port).Wait(500);$occupied=$connected -and $client.Connected}catch{$occupied=$false}finally{$client.Dispose()}
 if($occupied){Write-Host "$($job.Name): port $($job.Port) already in use; reusing the running service.";continue}
 $process=Start-Process -FilePath $shell -ArgumentList @('-NoProfile','-File',('"'+(Join-Path $job.Root $job.Script)+'"')) -WorkingDirectory $job.Root -WindowStyle Hidden -RedirectStandardOutput (Join-Path $job.Root ($job.Name.ToLower()+'-launcher.log')) -RedirectStandardError (Join-Path $job.Root ($job.Name.ToLower()+'-launcher-errors.log')) -PassThru
 Write-Host "$($job.Name) starting (PID $($process.Id))."
}
Write-Host 'Open http://localhost:5173/#/ after the backend log reports Started. MySQL80 must be running.'
