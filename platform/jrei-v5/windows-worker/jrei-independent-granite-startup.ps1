#Requires -Version 5.1
<#
 Owner-approved non-Qwen IBM Granite activation using the EXISTING vetted
 llama-server.exe. Official GGUF bytes are downloaded and SHA256 checked by
 windows_official_granite_acquisition.py. One private task on 127.0.0.1:8093;
 no Bertina, Python core, original website deploy, 8081/8082 or other tasks.
#>
[CmdletBinding()]
param(
 [ValidateSet('Install','Run','Status')][string]$Mode='Status',
 [switch]$OwnerApproved
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if($env:OS -cne 'Windows_NT'){throw 'JREI_GRANITE_WINDOWS_ONLY'}
$root=Join-Path $env:LOCALAPPDATA 'JREI'
$private=Join-Path $root 'command-center'
$backend=Join-Path $private 'language-engine.json'
$store=Join-Path $root 'models'
$workerCfg=Join-Path $root 'jrei-worker-config.json'
$repo=Join-Path $env:LOCALAPPDATA 'JREI-Python\repo'
$project=Join-Path $repo 'platform\jrei-python'
$py=Join-Path $env:LOCALAPPDATA 'JREI-Python\venv\Scripts\python.exe'
$taskName='JREI-Owner-Independent-Language-Model'
$port=8093
$modelId='jrei-granite-4.1-3b'
$owner=[Security.Principal.WindowsIdentity]::GetCurrent()
function Report([string]$message) {
 if($message -cnotmatch '^[A-Z0-9_]{4,90}$'){throw 'JREI_GRANITE_EVENT_INVALID'}
 Write-Output ('[JREI] '+$message)
}
function Config {
 if(-not (Test-Path -LiteralPath $backend -PathType Leaf) -or
    (Get-Item -LiteralPath $backend).Length -gt 6000){
  throw 'JREI_GRANITE_ENGINE_NOT_CONFIGURED'
 }
 $cfg=Get-Content -LiteralPath $backend -Raw -Encoding UTF8|ConvertFrom-Json
 if($cfg.schema -cne 'jr.jrei.windows-language-engine.v1' -or
    $cfg.family -cne 'granite' -or $cfg.model_id -cne $modelId -or
    $cfg.endpoint -cne 'http://127.0.0.1:8093/v1/chat/completions' -or
    $cfg.owner_approved -ne $true -or $cfg.rights_reviewed -ne $true){
  throw 'JREI_GRANITE_CONFIG_INVALID'
 }
 $model=[string]$cfg.model_file
 $path=[IO.Path]::GetFullPath($model)
 $prefix=[IO.Path]::GetFullPath($store)+[IO.Path]::DirectorySeparatorChar
 if(-not [IO.Path]::IsPathRooted($model) -or
    -not $path.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase) -or
    -not [IO.File]::Exists($model)){
  throw 'JREI_GRANITE_MODEL_OUTSIDE_PRIVATE_STORE'
 }
 $expected=[string]$cfg.model_sha256
 if($expected -cnotmatch '^[a-f0-9]{64}$' -or
    (Get-FileHash -LiteralPath $model -Algorithm SHA256).Hash.ToLowerInvariant() -cne $expected){
  throw 'JREI_GRANITE_MODEL_SHA_MISMATCH'
 }
 return $cfg
}
function ExistingLlama {
 if(-not (Test-Path -LiteralPath $workerCfg -PathType Leaf)){
  throw 'JREI_EXISTING_LLAMA_CONFIG_REQUIRED'
 }
 $cfg=Get-Content -LiteralPath $workerCfg -Raw -Encoding UTF8|ConvertFrom-Json
 $exe=[string]$cfg.localChat.backendExe
 $sha=[string]$cfg.localChat.backendExeSha256
 if(-not [IO.Path]::IsPathRooted($exe) -or
    [IO.Path]::GetFileName($exe) -ine 'llama-server.exe' -or
    $sha -cnotmatch '^[a-f0-9]{64}$' -or
    -not [IO.File]::Exists($exe)){
  throw 'JREI_EXISTING_LLAMA_NOT_APPROVED'
 }
 if((Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLowerInvariant() -cne $sha){
  throw 'JREI_LLAMA_RUNTIME_SHA_MISMATCH'
 }
 return $exe
}
function Ready {
 try{
  $models=Invoke-RestMethod -Uri 'http://127.0.0.1:8093/v1/models' -TimeoutSec 5
  foreach($item in @($models.data)){
   if($item.id -ceq $modelId){return $true}
  }
 }catch{}
 return $false
}
if($Mode -eq 'Status'){
 $task=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
 Report $(if($null -eq $task){'GRANITE_TASK_NOT_REGISTERED'}else{'GRANITE_TASK_PRESENT'})
 Report $(if(Ready){'GRANITE_ENDPOINT_RESPONDING'}else{'GRANITE_ENDPOINT_OFFLINE'})
 return
}
if(-not $OwnerApproved){throw 'JREI_GRANITE_OWNER_APPROVAL_REQUIRED'}
if($Mode -eq 'Run'){
 $cfg=Config
 $exe=ExistingLlama
 if(Ready){Report 'GRANITE_ALREADY_RESPONDING';return}
 if(@(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue).Count -gt 0){
  throw 'JREI_GRANITE_PORT_OCCUPIED'
 }
 # CPU safe fallback. GPU acceleration requires separate per-PC assessment;
 # never claim either graphics card is already being used.
 $argv=@('--model',('"' + [string]$cfg.model_file + '"'),
         '--alias',$modelId,'--host','127.0.0.1','--port','8093',
         '--ctx-size','4096','--n-gpu-layers','0')
 $process=Start-Process -FilePath $exe -ArgumentList $argv -WorkingDirectory (Split-Path -Parent $exe) -Wait -PassThru -NoNewWindow
 if($process.ExitCode -ne 0){throw 'JREI_GRANITE_RUN_FAILED'}
 return
}
if($Mode -ne 'Install'){throw 'JREI_GRANITE_INVALID_MODE'}
if(-not (Test-Path -LiteralPath $py -PathType Leaf) -or
   -not (Test-Path -LiteralPath $project -PathType Container)){
 throw 'JREI_GRANITE_EXISTING_PYTHON_REQUIRED'
}
$null=ExistingLlama
Push-Location $project
try {
 $output=& $py -B -m jrei_service.windows_official_granite_acquisition --private $private --owner-approved --rights-reviewed
 if($LASTEXITCODE -ne 0){throw 'JREI_GRANITE_DOWNLOAD_REJECTED'}
 $result=$output|Select-Object -Last 1|ConvertFrom-Json
}finally{Pop-Location}
if($result.state -cne 'OWNER_LOCAL_WEIGHTS_STAGED_UNTESTED'){
 throw 'JREI_GRANITE_CHECKSUM_NOT_ACCEPTED'
}
$config=@{
 schema='jr.jrei.windows-language-engine.v1'
 engine_id='jrei-granite-independent'
 family='granite';model_id=$modelId
 endpoint='http://127.0.0.1:8093/v1/chat/completions'
 model_file=[string]$result.model_file
 model_sha256=[string]$result.model_sha256
 rights_reviewed=$true;owner_approved=$true;enabled=$true
}
if(Test-Path -LiteralPath $backend){
 $prior=Get-Content -LiteralPath $backend -Raw -Encoding UTF8|ConvertFrom-Json
 if($prior.family -cne 'granite' -or $prior.model_sha256 -cne $result.model_sha256){
  throw 'JREI_EXISTING_INDEPENDENT_MODEL_CONFIG_PRESERVED'
 }
}else{
 New-Item -ItemType Directory -Force -Path $private|Out-Null
 $temp=$backend+'.'+[guid]::NewGuid().ToString('N')+'.tmp'
 try{
  [IO.File]::WriteAllText($temp,($config|ConvertTo-Json -Depth 5),[Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $temp -Destination $backend
 }finally{if(Test-Path -LiteralPath $temp){Remove-Item -LiteralPath $temp -Force}}
}
$null=Config
$existing=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if($null -ne $existing){
 Report 'GRANITE_EXISTING_TASK_PRESERVED'
 if(-not (Ready)){Start-ScheduledTask -TaskName $taskName -ErrorAction Stop}
}else{
 $ps=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
 $action=New-ScheduledTaskAction -Execute $ps -Argument ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "'+$PSCommandPath+'" -Mode Run -OwnerApproved') -WorkingDirectory $project
 $trigger=New-ScheduledTaskTrigger -AtLogOn -User $owner.Name
 $settings=New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Seconds 0) -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 2)
 $principal=New-ScheduledTaskPrincipal -UserId $owner.Name -LogonType Interactive -RunLevel Limited
 Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'JREI owner-private IBM Granite on 127.0.0.1:8093'|Out-Null
 Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
}
$online=$false
for($i=0;$i -lt 30;$i++){
 if(Ready){$online=$true;break}
 Start-Sleep -Seconds 2
}
Report $(if($online){'GRANITE_LOCAL_MODEL_RESPONDING_UNVERIFIED_QUALITY'}else{'GRANITE_INSTALLED_BUT_LOCAL_RUNTIME_NOT_CONFIRMED'})
Report 'NO_QWEN_TASK_OR_WEBSITE_CHANGE'
