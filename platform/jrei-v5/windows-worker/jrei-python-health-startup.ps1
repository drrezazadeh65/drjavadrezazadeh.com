#Requires -Version 5.1
<#
  JREI signed outbound Python-node liveness registration (source-staged).
  Default Check mode is read-only; Install/Uninstall need -OwnerApproved.
  Reuses original registered Ed25519 DPAPI identity; no new key generation,
  no change to Qwen tasks, no inbound port, no MySQL or deployment writes.
  Register only after Bertina has deployed and enabled signed node endpoint.
#>
[CmdletBinding()]
param(
  [ValidateSet('Check','Install','Uninstall')]
  [string]$Mode='Check',
  [string]$ConfigPath=(Join-Path $env:LOCALAPPDATA 'JREI\jrei-worker-config.json'),
  [switch]$OwnerApproved
)
$ErrorActionPreference='Stop'
if($env:OS -ne 'Windows_NT') { throw 'JREI_WINDOWS_ONLY' }
$taskName='JREI-Python-Health-Outbound'
$pythonHealth='http://127.0.0.1:8091/internal/v1/health'
function LocalPythonReady {
  try {
    $r=Invoke-RestMethod -Uri $pythonHealth -Method Get -TimeoutSec 4
    return $r.schema -ceq 'jr.jrei.python-health.v1' -and
      $r.service -ceq 'jrei-private-python' -and
      $r.service_process -ceq 'RESPONDING' -and
      $r.production_ready -eq $false
  } catch { return $false }
}
$healthy=LocalPythonReady
Write-Output ('[JREI] PYTHON_LOOPBACK_8091=' + $(if($healthy){'RESPONDING'}else{'UNAVAILABLE'}))
$existing=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
Write-Output ('[JREI] OUTBOUND_BRIDGE_TASK=' +
  $(if($null -eq $existing){'NOT_REGISTERED'}else{$existing.State.ToString()}))
Write-Output '[JREI] PYTHON_MOTHER_DB=NOT_ATTESTED'
Write-Output '[JREI] NEWS_CRAWLING_TRAINING=NOT_ENABLED_BY_THIS_SCRIPT'
if($Mode -eq 'Check') { return }
if(-not $OwnerApproved) { throw 'EXPLICIT_OWNER_APPROVAL_REQUIRED' }
if($Mode -eq 'Uninstall') {
  if($null -ne $existing) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Output '[JREI] PYTHON_OUTBOUND_TASK_UNREGISTERED'
  }
  return
}
if($null -ne $existing) { throw 'OUTBOUND_TASK_ALREADY_REGISTERED_NOT_OVERWRITTEN' }
if(-not $healthy) { throw 'LOCAL_PYTHON_NOT_RESPONDING' }
if(-not [IO.Path]::IsPathRooted($ConfigPath) -or
   -not (Test-Path -LiteralPath $ConfigPath -PathType Leaf) -or
   $ConfigPath.Contains('"') -or $ConfigPath.Length -gt 500) {
  throw 'EXISTING_PRIVATE_WORKER_CONFIG_REQUIRED'
}
if(-not (Test-Path -LiteralPath (Join-Path $env:LOCALAPPDATA 'JREI\jrei-worker-key.dpapi') -PathType Leaf)){
  throw 'EXISTING_NODE_DPAPI_IDENTITY_MISSING_NO_REREGISTRATION'
}
$cfg=Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
if($cfg.protocol -cne 'jr.jrei.windows-worker.v1' -or
   $cfg.origin -cne 'https://drjavadrezazadeh.com' -or
   $cfg.nodeId -cnotmatch '^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$') {
  throw 'PRIVATE_CONFIG_SCOPE_INVALID'
}
$entry=Join-Path $PSScriptRoot 'jrei-worker.mjs'
if(-not (Test-Path -LiteralPath $entry -PathType Leaf)) {
  throw 'APPROVED_WORKER_ENTRY_MISSING'
}
$nodeExe=(Get-Command node.exe -ErrorAction Stop).Source
if(-not [IO.Path]::IsPathRooted($nodeExe)) { throw 'NODE_EXECUTABLE_NOT_ABSOLUTE' }
$version=(& $nodeExe --version)
if($LASTEXITCODE -ne 0 -or $version -notmatch '^v(2[0-9]|[3-9][0-9])\.') {
  throw 'NODE_RUNTIME_VERSION_UNSUPPORTED'
}
$action=New-ScheduledTaskAction -Execute $nodeExe -Argument (
  '"' + $entry + '" start-python-health "' + ([IO.Path]::GetFullPath($ConfigPath)) + '"'
) -WorkingDirectory $PSScriptRoot
$who="$env:USERDOMAIN\$env:USERNAME"
$trigger=New-ScheduledTaskTrigger -AtLogOn -User $who
$principal=New-ScheduledTaskPrincipal -UserId $who -LogonType Interactive -RunLevel Limited
$settings=New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Seconds 0)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Owner private signed Python liveness report over outbound HTTPS. No model execution.'
Write-Output '[JREI] OUTBOUND_BRIDGE_TASK_REGISTERED_AT_LOGON'
Write-Output '[JREI] THIS_ACTION_DID_NOT_START_TASK_OR_CHANGE_QWEN'
