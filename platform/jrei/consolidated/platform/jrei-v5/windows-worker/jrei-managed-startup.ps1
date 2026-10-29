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
  .\jrei-managed-startup.ps1 -Mode install -WorkerMode pilot -ConfigPath "C:\Private\jrei-worker.json" -OwnerApproved
  .\jrei-managed-startup.ps1 -Mode remove -WorkerMode pilot -OwnerApproved

  Existing task registrations are NOT silently replaced by this source update.\n  Recurring retry is only for a task registered through this revised script;\n  it does not bypass owner/node authorization or prove Bertina connectivity.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)]
  [ValidateSet('install','remove')]
  [string]$Mode,
  [string]$ConfigPath,
  [ValidateSet('evaluation','chat','model','pilot')]
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
}elseif($WorkerMode -eq 'pilot'){
  'JREI-Owner-Private-Pilot-Worker'
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
$runMode=if($WorkerMode -eq 'chat'){'start-chat'}
  elseif($WorkerMode -eq 'pilot'){'start-pilot'}
  else{'start'}
if($WorkerMode -eq 'pilot'){
  # Pilot is a signed owner-only queue. It is never a substitute for public
  # quality approval and must not launch with a disabled rights review.
  try {$pilotSettings=Get-Content -LiteralPath $fullConfig -Raw -Encoding UTF8 |
    ConvertFrom-Json} catch {throw 'OWNER_PILOT_PRIVATE_CONFIG_UNREADABLE'}
  if($pilotSettings.localChat.ownerApproved -ne $true -or
     $pilotSettings.localChat.rightsReviewed -ne $true -or
     $pilotSettings.localChat.enabled -ne $false){
    throw 'OWNER_PILOT_REQUIRES_REVIEWED_RIGHTS_AND_PUBLIC_CHAT_OFF'
  }
}
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
  # The registered LOCAL model may already be staged and usable while public
  # generative access is deliberately OFF. Keep it on loopback after logon
  # without forcing unreviewed quality/rights flags to true. This grants NO
  # new server authorisation and does not change the private JSON.
  try {$privateSettings=Get-Content -LiteralPath $fullConfig -Raw -Encoding UTF8 |
    ConvertFrom-Json} catch {throw 'LOCAL_MODEL_PRIVATE_CONFIG_UNREADABLE'}
  if($privateSettings.localChat.ownerApproved -ne $true){
    throw 'LOCAL_MODEL_OWNER_APPROVAL_MISSING'
  }
  $stagingFlag=if($privateSettings.localChat.enabled -eq $false){
    ' -StagingOnly'
  }elseif($privateSettings.localChat.enabled -eq $true -and
          $privateSettings.localChat.rightsReviewed -eq $true -and
          $privateSettings.localChat.modelRuntimeVerified -eq $true -and
          ($privateSettings.localChat.independentQualityAccepted -eq $true -or
           $privateSettings.localChat.publicUnvalidatedOwnerApproved -eq $true)){
    ''
  }else{
    throw 'LOCAL_MODEL_PRIVATE_APPROVAL_INCOMPLETE'
  }
  $action=New-ScheduledTaskAction -Execute $psExe -Argument (
    '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "'+
    $escapedLauncher+'" -ConfigPath "'+$escapedConfig+'" -OwnerApproved'+$stagingFlag
  ) -WorkingDirectory $PSScriptRoot
}else{
  $action=New-ScheduledTaskAction -Execute $node -Argument (
    '"' + $escapedWorker + '" ' + $runMode + ' "' + $escapedConfig + '"'
  ) -WorkingDirectory $PSScriptRoot
}
# A logon trigger alone cannot recover a worker which exits later. The
# recurring trigger makes a missed/terminated task eligible for restart while
# IgnoreNew prevents a second worker instance when the first is still running.
# Both triggers use the SAME original signed identity/config/action.
$trigger=New-ScheduledTaskTrigger -AtLogOn -User $user
$recoveryTrigger=New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) `
  -RepetitionInterval (New-TimeSpan -Minutes 5) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
$settings=New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
  -MultipleInstances IgnoreNew -StartWhenAvailable:$true `
  -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 2)
$principal=New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($trigger,$recoveryTrigger) `
  -Settings $settings -Principal $principal -Description (
    'JREI outgoing-only approved worker; local chat requires an independently running localhost language model.'
  ) -ErrorAction Stop | Out-Null
Write-Output 'JREI task registered for owner logon and 5-minute crash recovery checks.'
Write-Output 'This does not enable the Bertina private backend or prove inference.'
