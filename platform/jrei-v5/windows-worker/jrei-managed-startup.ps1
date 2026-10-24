<#
  Optional JREI Windows 11 Task Scheduler startup: NEVER runs at commit
  or upon download. Explicit owner action required on EACH independent PC.
  Uses the currently signed-in Windows account, limited privileges and
  only the fixed audited Node entrypoint. Does not download a model, install
  software, open a port, change Windows firewall or access remote desktops.

  Examples (only AFTER owner-authorized final acceptance):
  .\jrei-managed-startup.ps1 -Mode install -ConfigPath "C:\Private\jrei-worker.json" -OwnerApproved
  .\jrei-managed-startup.ps1 -Mode remove -OwnerApproved
  .\jrei-managed-startup.ps1 -Mode install -WorkerMode chat -ConfigPath "C:\Private\jrei-worker.json" -OwnerApproved
  .\jrei-managed-startup.ps1 -Mode remove -WorkerMode chat -OwnerApproved
  .\jrei-managed-startup.ps1 -Mode install -WorkerMode model -ConfigPath "C:\Private\jrei-worker.json" -OwnerApproved
  .\jrei-managed-startup.ps1 -Mode remove -WorkerMode model -OwnerApproved

  Script registration is no proof of real Bertina worker connectivity.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)]
  [ValidateSet('install','remove')]
  [string]$Mode,
  [string]$ConfigPath,
  [ValidateSet('evaluation','chat','model')]
  [string]$WorkerMode='evaluation',
  [switch]$OwnerApproved
)
$ErrorActionPreference='Stop'
if(-not $OwnerApproved){throw 'Explicit owner approval required.'}
if(-not [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform(
  [System.Runtime.InteropServices.OSPlatform]::Windows)){
  throw 'Only Windows is supported.'
}
$taskName=if($WorkerMode -eq 'chat'){
  'JREI-Owner-Local-Chat-Worker'
}elseif($WorkerMode -eq 'model'){
  'JREI-Owner-Local-Model'
}else{'JREI-Owner-Outbound-Worker'}
if($Mode -eq 'remove'){
  $task=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  if($null -ne $task){
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
  }
  Write-Output 'JREI automatic startup registration removed (if present).'
  exit 0
}
if([string]::IsNullOrWhiteSpace($ConfigPath)){
  throw 'An absolute private configuration path is required.'
}
$fullConfig=[IO.Path]::GetFullPath($ConfigPath)
if(-not [IO.Path]::IsPathRooted($ConfigPath)){
  throw 'Relative configuration paths are forbidden.'
}
if(-not [IO.File]::Exists($fullConfig)){
  throw 'The owner-private config does not exist.'
}
$worker=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'jrei-worker.mjs'))
if(-not [IO.File]::Exists($worker)){throw 'JREI source entrypoint missing.'}
$node=(Get-Command node.exe -CommandType Application -ErrorAction Stop).Source
if(-not [IO.Path]::IsPathRooted($node)){throw 'Absolute Node.js executable required.'}
$user=[Security.Principal.WindowsIdentity]::GetCurrent().Name
if([string]::IsNullOrWhiteSpace($user)){throw 'Windows owner identity required.'}
$existing=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if($null -ne $existing){
  throw 'Existing JREI scheduled task requires manual removal before change.'
}
# Powershell's scheduled-task action launcher quotes each fixed absolute
# path as one argument. Both paths are owner-local and never from AI output.
$escapedWorker=$worker.Replace('"','')
$escapedConfig=$fullConfig.Replace('"','')
$runMode=if($WorkerMode -eq 'chat'){'start-chat'}else{'start'}
if($WorkerMode -eq 'model'){
  $reviewedLauncher=[IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot 'jrei-local-model-start.ps1'))
  if(-not [IO.File]::Exists($reviewedLauncher)){
    throw 'JREI_LOCAL_MODEL_LAUNCHER_MISSING'
  }
  $psExe=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  if(-not [IO.File]::Exists($psExe)){
    throw 'TRUSTED_WINDOWS_POWERSHELL_UNAVAILABLE'
  }
  $escapedLauncher=$reviewedLauncher.Replace('"','')
  $action=New-ScheduledTaskAction -Execute $psExe -Argument (
    '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "'+
    $escapedLauncher+'" -ConfigPath "'+$escapedConfig+'" -OwnerApproved'
  ) -WorkingDirectory $PSScriptRoot
}else{
  $action=New-ScheduledTaskAction -Execute $node -Argument (
    '"' + $escapedWorker + '" ' + $runMode + ' "' + $escapedConfig + '"'
  ) -WorkingDirectory $PSScriptRoot
}
$trigger=New-ScheduledTaskTrigger -AtLogOn -User $user
$settings=New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
  -MultipleInstances IgnoreNew -StartWhenAvailable:$false `
  -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 2)
$principal=New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal -Description (
    'JREI outgoing-only approved worker; local chat requires an independently running localhost language model.'
  ) -ErrorAction Stop | Out-Null
Write-Output 'JREI task registered for the current user AT NEXT LOGON only.'
Write-Output 'This does not enable the Bertina private backend or prove inference.'
