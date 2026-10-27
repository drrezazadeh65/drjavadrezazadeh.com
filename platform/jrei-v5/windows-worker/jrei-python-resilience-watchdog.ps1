#Requires -Version 5.1
<#
  JREI Python Core resilience guard (owner opt-in, source-only).
  Logon + recurring check; may START the existing, reviewed Python 8091 task
  if it has stopped. It NEVER runs pip, git, Python code from a URL, MySQL,
  arbitrary shell commands, or Windows reboot, and NEVER touches Qwen 8081.
  A running but unhealthy Python process is NOT force-killed/replaced.
  Repeated unsuccessful starts trip a cooldown/circuit breaker.
#>
[CmdletBinding()]
param(
  [ValidateSet('Check','Install','Uninstall','ObserveAndRecover')]
  [string]$Mode='Check',
  [switch]$OwnerApproved
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if($env:OS -ne 'Windows_NT'){throw 'JREI_WINDOWS_ONLY'}
$taskName='JREI-Python-Resilience-Watchdog'
$coreTask='JREI-Python-Core'
$root=Join-Path $env:LOCALAPPDATA 'JREI-Python'
$statePath=Join-Path $root 'python-watchdog-state.json'
$logPath=Join-Path $root 'python-watchdog.log'
$expected='-m uvicorn jrei_service.app:app --host 127.0.0.1 --port 8091 --workers 1'
$uri='http://127.0.0.1:8091/internal/v1/health'

function Emit([string]$code){
 if($code -cnotmatch '^[A-Z0-9_]{4,80}$'){throw 'INVALID_WATCHDOG_EVENT'}
 Write-Output ('[JREI] '+$code)
 if($Mode -eq 'ObserveAndRecover'){
  try{
   if((Test-Path -LiteralPath $logPath -PathType Leaf) -and
      (Get-Item -LiteralPath $logPath).Length -gt 1048576){
     Move-Item -LiteralPath $logPath -Destination (
       Join-Path $root 'python-watchdog.previous.log') -Force
   }
   Add-Content -LiteralPath $logPath -Encoding UTF8 -Value (
     [DateTime]::UtcNow.ToString('o')+' '+$code)
  }catch{Write-Output '[JREI] WATCHDOG_LOG_UNAVAILABLE'}
 }
}

function CoreTaskTrusted {
 $task=Get-ScheduledTask -TaskName $coreTask -ErrorAction Stop
 if($task.Actions.Count -ne 1){throw 'PYTHON_CORE_ACTION_COUNT_UNEXPECTED'}
 $action=$task.Actions[0]
 if(($action.Arguments+'').Trim() -cne $expected){
  throw 'PYTHON_CORE_ARGUMENTS_UNTRUSTED'
 }
 $exe=[IO.Path]::GetFullPath(
   [Environment]::ExpandEnvironmentVariables($action.Execute))
 $base=[IO.Path]::GetFullPath((Join-Path $root 'venv\Scripts\python.exe'))
 $prefix=[IO.Path]::GetFullPath((Join-Path $root 'runtimes')) +
   [IO.Path]::DirectorySeparatorChar
 if(-not ($exe -ieq $base -or
    ($exe.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase) -and
     $exe.EndsWith('\Scripts\python.exe',
       [StringComparison]::OrdinalIgnoreCase)))){
   throw 'PYTHON_CORE_EXECUTABLE_UNTRUSTED'
 }
 if(-not (Test-Path -LiteralPath $exe -PathType Leaf)){
   throw 'PYTHON_CORE_EXECUTABLE_MISSING'
 }
 return $task
}

function Healthy {
 try{
   $data=Invoke-RestMethod -Uri $uri -TimeoutSec 3
   return $data.schema -ceq 'jr.jrei.python-health.v1' -and
     $data.service -ceq 'jrei-private-python' -and
     $data.service_process -ceq 'RESPONDING'
 }catch{return $false}
}

function LastStartTimes([int64]$now){
 if(-not (Test-Path -LiteralPath $statePath -PathType Leaf)){return @()}
 try{
   $doc=Get-Content -LiteralPath $statePath -Raw -Encoding UTF8 |
     ConvertFrom-Json
   if($doc.schema -cne 'jr.jrei.python-watchdog-circuit.v1'){return @()}
   return @($doc.starts | ForEach-Object {
      if($_ -is [ValueType] -and [int64]$_ -ge ($now - 1800) -and
         [int64]$_ -le ($now+10)){[int64]$_}
   })
 }catch{return @()}
}

function SaveStartTimes([int64[]]$times){
 $json=@{schema='jr.jrei.python-watchdog-circuit.v1';
   starts=@($times)}|ConvertTo-Json -Compress -Depth 4
 $tmp=$statePath+'.'+[guid]::NewGuid().ToString('N')+'.tmp'
 try{
   [IO.File]::WriteAllText($tmp,$json,[Text.UTF8Encoding]::new($false))
   Move-Item -LiteralPath $tmp -Destination $statePath -Force
 }finally{
   if(Test-Path -LiteralPath $tmp){Remove-Item -LiteralPath $tmp -Force}
 }
}

if($Mode -eq 'Uninstall'){
 if(-not $OwnerApproved){throw 'JREI_OWNER_APPROVAL_REQUIRED'}
 $t=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
 if($null -ne $t){Unregister-ScheduledTask -TaskName $taskName -Confirm:$false}
 Emit 'PYTHON_WATCHDOG_UNREGISTERED'
 return
}
$pythonTask=CoreTaskTrusted
if($Mode -eq 'Check'){
 Emit $(if(Healthy){'PYTHON_8091_RESPONDING'}else{'PYTHON_8091_NOT_RESPONDING'})
 Emit $(if($pythonTask.State -eq 'Running'){
    'PYTHON_CORE_TASK_RUNNING'}else{'PYTHON_CORE_TASK_NOT_RUNNING'})
 $wd=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
 Emit $(if($null -ne $wd){'PYTHON_WATCHDOG_REGISTERED'}else{
    'PYTHON_WATCHDOG_NOT_REGISTERED'})
 return
}
if($Mode -eq 'Install'){
 if(-not $OwnerApproved){throw 'JREI_OWNER_APPROVAL_REQUIRED'}
 $already=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
 if($already){Emit 'PYTHON_WATCHDOG_ALREADY_REGISTERED';return}
 $script=$MyInvocation.MyCommand.Path
 if(-not [IO.Path]::IsPathRooted($script) -or $script.Contains('"')){
  throw 'WATCHDOG_SCRIPT_PATH_INVALID'
 }
 $shell=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
 if(-not (Test-Path -LiteralPath $shell)){throw 'WINDOWS_POWERSHELL_MISSING'}
 $action=New-ScheduledTaskAction -Execute $shell -Argument (
  '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "'+
  $script+'" -Mode ObserveAndRecover'
 ) -WorkingDirectory $root
 $user="$env:USERDOMAIN\$env:USERNAME"
 $logon=New-ScheduledTaskTrigger -AtLogOn -User $user
 $periodic=New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(3) `
  -RepetitionInterval (New-TimeSpan -Minutes 5) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
 $principal=New-ScheduledTaskPrincipal -UserId $user `
   -LogonType Interactive -RunLevel Limited
 $settings=New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew `
   -ExecutionTimeLimit (New-TimeSpan -Minutes 2)
 Register-ScheduledTask -TaskName $taskName -Action $action `
   -Trigger @($logon,$periodic) -Principal $principal -Settings $settings `
   -Description 'Bounded JREI Python 8091 liveness-only recovery; no Qwen, model changes or Windows restart.' |
   Out-Null
 Emit 'PYTHON_WATCHDOG_REGISTERED_NO_START'
 return
}
if($Mode -ne 'ObserveAndRecover'){throw 'WATCHDOG_UNAPPROVED_MODE'}
if(Healthy){Emit 'PYTHON_8091_RESPONDING_NO_CHANGE';return}
if($pythonTask.State -eq 'Running'){
 Emit 'PYTHON_CORE_RUNNING_BUT_UNHEALTHY_NO_FORCE_STOP'
 return
}
# We NEVER change an active/unowned listener on the shared loopback port.
$listener=Get-NetTCPConnection -State Listen -LocalPort 8091 `
 -ErrorAction SilentlyContinue
if($listener){
 Emit 'PYTHON_PORT_BUSY_NO_RECOVERY'
 return
}
$now=[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$recent=@(LastStartTimes $now)
if($recent.Count -ge 3){
 Emit 'PYTHON_RECOVERY_CIRCUIT_OPEN'
 return
}
# Record attempt before the start so an interrupted task cannot evade the
# circuit breaker. Restore failure is NOT silently retried indefinitely.
SaveStartTimes ([int64[]](@($recent)+@($now)))
Start-ScheduledTask -TaskName $coreTask -ErrorAction Stop
Start-Sleep -Seconds 6
if(Healthy){Emit 'PYTHON_CORE_RECOVERED_FROM_REGISTERED_TASK'}
else{Emit 'PYTHON_CORE_RECOVERY_UNCONFIRMED'}
