#Requires -Version 5.1
<#
  JREI Windows *code transfer only* (not a Python/Qwen installer).
  - Exact origin and canonical branch; fast-forward only.
  - No reset, clean, checkout, delete, pip, task restart, keys or user data.
  - Existing untracked __pycache__ folders are intentionally preserved.
  - Enable once with -Mode Install -OwnerApproved. Default is read-only Check.
  - The scheduled task runs every 30 minutes while this Windows account
    can run interactive logon tasks. It requires GitHub connectivity.
#>
[CmdletBinding()]
param(
  [ValidateSet('Check','Sync','Install','Uninstall')]
  [string]$Mode='Check',
  [switch]$OwnerApproved
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if($env:OS -ne 'Windows_NT'){ throw 'JREI_WINDOWS_ONLY' }
$taskName='JREI-Repo-Auto-Sync'
$root=Join-Path $env:LOCALAPPDATA 'JREI-Python'
$repo=Join-Path $root 'repo'
$log=Join-Path $root 'repo-auto-sync.log'
$branch='migration/bertina-linux6'
$origin='https://github.com/drrezazadeh65/drjavadrezazadeh.com'
$remoteRef='refs/remotes/origin/migration/bertina-linux6'
function Report([string]$code){
  if($code -notmatch '^[A-Z0-9_:-]{2,100}$'){throw 'SYNC_LOG_CODE_INVALID'}
  Write-Output ('[JREI] '+$code)
  if($Mode -ne 'Check'){
    try{
      if(-not (Test-Path -LiteralPath $root -PathType Container)){return}
      if((Test-Path -LiteralPath $log -PathType Leaf) -and
         (Get-Item -LiteralPath $log).Length -ge 1048576){
        Rename-Item -LiteralPath $log -NewName 'repo-auto-sync.previous.log' -Force
      }
      Add-Content -LiteralPath $log -Encoding UTF8 -Value ((Get-Date).ToUniversalTime().ToString('o')+' '+$code)
    }catch{Write-Output '[JREI] SYNC_LOCAL_LOG_UNAVAILABLE'}
  }
}
# Windows PowerShell 5.1 translates native Git's stderr (including normal
# "From https://..." fetch progress) into NativeCommandError. With the global
# Stop preference, that error aborts a successful fetch before $LASTEXITCODE
# can be inspected. Keep the exception preference scoped to native calls and
# rely on the actual Git exit code; never ignore a nonzero exit status.
function GitCommand([string[]]$arguments){
  $savedPreference=$ErrorActionPreference
  try{
    $ErrorActionPreference='Continue'
    $result=& $script:gitExe -C $script:repo @arguments 2>$null
    $gitExitCode=$LASTEXITCODE
  }finally{
    $ErrorActionPreference=$savedPreference
  }
  if($gitExitCode -ne 0){throw 'JREI_GIT_COMMAND_FAILED'}
  return @($result)
}
function GitStatus([string[]]$arguments){
  $savedPreference=$ErrorActionPreference
  try{
    $ErrorActionPreference='Continue'
    & $script:gitExe -C $script:repo @arguments 1>$null 2>$null
    $gitExitCode=$LASTEXITCODE
  }finally{
    $ErrorActionPreference=$savedPreference
  }
  return $gitExitCode
}
function Preconditions{
  if(-not (Test-Path -LiteralPath $repo -PathType Container)){throw 'JREI_REPO_MISSING'}
  $gitCmd=Get-Command git.exe -ErrorAction Stop
  $script:gitExe=$gitCmd.Source
  if(-not [IO.Path]::IsPathRooted($script:gitExe)){throw 'JREI_GIT_NOT_ABSOLUTE'}
  if((GitStatus -arguments @('rev-parse','--is-inside-work-tree')) -ne 0){
    throw 'JREI_REPO_NOT_GIT'
  }
  $actualRemote=(GitCommand -arguments @('remote','get-url','origin') | Out-String).Trim()
  if($actualRemote -cne $origin -and $actualRemote -cne ($origin+'.git')){
    throw 'JREI_UNTRUSTED_GIT_ORIGIN'
  }
  $active=(GitCommand -arguments @('branch','--show-current') | Out-String).Trim()
  if($active -cne $branch){throw 'JREI_WRONG_BRANCH'}
  if((GitStatus -arguments @('diff','--quiet','--exit-code')) -ne 0 -or
     (GitStatus -arguments @('diff','--cached','--quiet','--exit-code')) -ne 0){
    throw 'JREI_LOCAL_TRACKED_CHANGES_PRESERVED'
  }
}
try{
  if($Mode -eq 'Uninstall'){
    if(-not $OwnerApproved){throw 'JREI_OWNER_APPROVAL_REQUIRED'}
    $existing=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if($existing){Unregister-ScheduledTask -TaskName $taskName -Confirm:$false}
    Report 'REPO_SYNC_TASK_UNREGISTERED'
    return
  }
  Preconditions
  if($Mode -eq 'Check'){
    $head=(GitCommand -arguments @('rev-parse','--short','HEAD') | Out-String).Trim()
    Report ('CURRENT_COMMIT:'+($head.ToUpperInvariant()))
    $task=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    Report $(if($task){'REPO_SYNC_TASK_REGISTERED'}else{'REPO_SYNC_TASK_NOT_REGISTERED'})
    Report 'GIT_PYTHON_TRANSFER_ONLY'
    return
  }
  if($Mode -eq 'Install'){
    if(-not $OwnerApproved){throw 'JREI_OWNER_APPROVAL_REQUIRED'}
    $exists=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if($exists){Report 'REPO_SYNC_TASK_ALREADY_REGISTERED';return}
    $systemRoot=$env:SystemRoot
    if(-not [IO.Path]::IsPathRooted($systemRoot)){
      throw 'JREI_SYSTEM_ROOT_INVALID'
    }
    $powershell=Join-Path $systemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    if(-not (Test-Path -LiteralPath $powershell -PathType Leaf)){
      throw 'JREI_POWERSHELL_MISSING'
    }
    $scriptPath=$MyInvocation.MyCommand.Path
    if(-not [IO.Path]::IsPathRooted($scriptPath) -or
       $scriptPath.Contains('"') -or $scriptPath.Length -gt 700){
      throw 'JREI_SCRIPT_PATH_INVALID'
    }
    $action=New-ScheduledTaskAction -Execute $powershell -Argument (
      '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "'+$scriptPath+'" -Mode Sync'
    ) -WorkingDirectory $root
    # A 30-min recurrent trigger plus logon safety; no user-session changes.
    $first=(Get-Date).AddMinutes(2)
    $repeat=New-ScheduledTaskTrigger -Once -At $first `
      -RepetitionInterval (New-TimeSpan -Minutes 30) `
      -RepetitionDuration (New-TimeSpan -Days 3650)
    $login=New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
    $principal=New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" `
      -LogonType Interactive -RunLevel Limited
    $settings=New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew `
      -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 2) `
      -ExecutionTimeLimit (New-TimeSpan -Minutes 6)
    Register-ScheduledTask -TaskName $taskName -Action $action `
      -Trigger @($repeat,$login) -Principal $principal -Settings $settings `
      -Description 'Safe 30min Git fast-forward ONLY from reviewed JREI canonical branch; never restarts model/Python.'
    Report 'REPO_SYNC_TASK_REGISTERED'
    Report 'NO_SERVICES_RESTARTED'
    return
  }
  if($Mode -ne 'Sync'){throw 'INVALID_MODE'}
  # Never fetch from another user-supplied URL, execute hooks received from
  # the remote, change process credentials, or force-reset divergent history.
  # Git merge --ff-only will refuse an overlap with untracked local files.
  $env:GIT_TERMINAL_PROMPT='0'
  $null=GitCommand -arguments @('-c','core.hooksPath=NUL','fetch','--no-tags',
    '--no-recurse-submodules','origin','refs/heads/migration/bertina-linux6:refs/remotes/origin/migration/bertina-linux6')
  # Ensure we have the remote-tracking ref locally even for shallow clones.
  if((GitStatus -arguments @('show-ref','--verify','--quiet',$remoteRef)) -ne 0){
    throw 'JREI_REMOTE_TRACKING_REF_MISSING'
  }
  if((GitStatus -arguments @('merge-base','--is-ancestor','HEAD',$remoteRef)) -ne 0){
    throw 'JREI_HISTORY_DIVERGED_PRESERVED'
  }
  $before=(GitCommand -arguments @('rev-parse','HEAD') | Out-String).Trim()
  $null=GitCommand -arguments @('-c','core.hooksPath=NUL','merge','--ff-only',$remoteRef)
  $after=(GitCommand -arguments @('rev-parse','HEAD') | Out-String).Trim()
  if($before -ceq $after){Report 'REPO_SYNC_UP_TO_DATE'}
  else{Report 'REPO_SYNC_FAST_FORWARDED'}
  # Separate owner-approved Python upgrade. The local opt-in marker is NEVER
  # committed or downloaded, and absent consent is a code-transfer-only run.
  # The upgrader stages in an isolated venv and may restart ONLY Python 8091.
  # Neither Qwen (8081) nor signed website workers are restarted.
  $optIn=Join-Path $root 'python-auto-upgrade-approved.json'
  $upgrader=Join-Path $repo 'platform\jrei-v5\windows-worker\jrei-python-safe-upgrade.ps1'
  if((Test-Path -LiteralPath $optIn -PathType Leaf) -and
     (Test-Path -LiteralPath $upgrader -PathType Leaf)){
    $shell=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    try{
      & $shell -NoProfile -NonInteractive -ExecutionPolicy Bypass `
        -File $upgrader -Mode Auto
      if($LASTEXITCODE -eq 0){Report 'PYTHON_SAFE_AUTO_INSTALL_CHECK_COMPLETE'}
      else{Report 'PYTHON_SAFE_AUTO_INSTALL_REQUIRES_REVIEW'}
    }catch{Report 'PYTHON_SAFE_AUTO_INSTALL_REQUIRES_REVIEW'}
  }else{
    Report 'PYTHON_AUTO_INSTALL_NOT_OPTED_IN'
  }
  # Reuse the EXISTING thirty-minute sync task and the owner-approved
  # local updater. Source downloads alone never restart the private app.
  $appApproval=Join-Path $root 'windows-owner-app-auto-update.json'
  $appUpdater=Join-Path $repo 'platform\jrei-v5\windows-worker\jrei-windows-app-auto-update.ps1'
  if((Test-Path -LiteralPath $appApproval -PathType Leaf) -and
     (Test-Path -LiteralPath $appUpdater -PathType Leaf)){
    $shell=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    try{
      # Forward bounded, known-safe child status codes to the durable
      # 30-minute sync ledger. A successful updater exit is NOT proof that
      # the newly fetched source was activated.
      $appMessages=@(& $shell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $appUpdater -Mode Auto)
      $appResult=$LASTEXITCODE
      foreach($message in @($appMessages | Select-Object -Last 16)){
        $line=[string]$message
        if($line -cmatch '^\[JREI\] ([A-Z0-9_]{4,90})
    }catch{Report 'WINDOWS_APP_UPDATE_REQUIRES_REVIEW'}
  }else{
    Report 'WINDOWS_APP_AUTO_UPDATE_NOT_OPTED_IN'
  }
}catch{
  # Avoid writing untrusted exception strings to a persistent log.
  Report 'REPO_SYNC_BLOCKED_NO_SERVICE_CHANGE'
  throw
}
){
          Report $Matches[1]
        }
      }
      if($appResult -eq 0){Report 'WINDOWS_APP_UPDATE_HANDLER_COMPLETED'}
      else{Report 'WINDOWS_APP_UPDATE_REQUIRES_REVIEW'}
    }catch{Report 'WINDOWS_APP_UPDATE_REQUIRES_REVIEW'}
  }else{
    Report 'WINDOWS_APP_AUTO_UPDATE_NOT_OPTED_IN'
  }
}catch{
  # Avoid writing untrusted exception strings to a persistent log.
  Report 'REPO_SYNC_BLOCKED_NO_SERVICE_CHANGE'
  throw
}
