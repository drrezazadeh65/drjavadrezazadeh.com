#Requires -Version 5.1
<#
 JREI Windows installed app and updater. Reuses existing startup and repo-sync tasks.
 Install is OWNER EXPLICIT, Auto is opt-in, snapshots immutable, rollback restores
 previous task action. Does not modify web hosting, language model or Python 8091.
 Source-only changes are staged and parsed before any opt-in promotion; health rollback remains required.
#>
[CmdletBinding()]
param(
 [ValidateSet('Check','Install','Auto','Disable')][string]$Mode='Check',
 [switch]$OwnerApproved
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if($env:OS -cne 'Windows_NT'){throw 'JREI_APP_WINDOWS_REQUIRED'}
$root=Join-Path $env:LOCALAPPDATA 'JREI-Python'
$repo=Join-Path $root 'repo'
$versions=Join-Path $root 'windows-owner-app-versions'
$marker=Join-Path $root 'windows-owner-app-auto-update.json'
$installed=Join-Path $root 'windows-owner-app-current.json'
$failed=Join-Path $root 'windows-owner-app-failed-source.json'
$py=Join-Path $root 'venv\Scripts\python.exe'
$tokenFile=Join-Path $env:LOCALAPPDATA 'JREI\command-center\owner-token'
$taskName='JREI-Owner-Windows-Command-Center'
$branch='migration/bertina-linux6'
$remote='https://github.com/drrezazadeh65/drjavadrezazadeh.com'
$owner=[Security.Principal.WindowsIdentity]::GetCurrent()
function Report([string]$code){
 if($code -cnotmatch '^[A-Z0-9_]{4,90}$'){throw 'JREI_APP_EVENT_INVALID'}
 Write-Output ('[JREI] '+$code)
}
function ReadJson([string]$path){
 if(-not (Test-Path -LiteralPath $path -PathType Leaf)){return $null}
 if((Get-Item -LiteralPath $path).Length -gt 5000){return $null}
 try{return (Get-Content -LiteralPath $path -Encoding UTF8 -Raw | ConvertFrom-Json)}
 catch{return $null}
}
function WriteJson([string]$path,[object]$value){
 $tmp=$path+'.'+[guid]::NewGuid().ToString('N')+'.tmp'
 try{
  [IO.File]::WriteAllText($tmp,($value|ConvertTo-Json -Depth 5),[Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $tmp -Destination $path -Force
 }finally{if(Test-Path -LiteralPath $tmp){Remove-Item -LiteralPath $tmp -Force}}
}
function Git([string[]]$argsList){
 $old=$ErrorActionPreference
 try{
  $ErrorActionPreference='Continue'
  $output=& $script:git -C $repo @argsList 2>$null
  $code=$LASTEXITCODE
 }finally{$ErrorActionPreference=$old}
 if($code -ne 0){throw 'JREI_APP_GIT_FAILURE'}
 return ($output|Out-String).Trim()
}
function GitExit([string[]]$argsList){
 $old=$ErrorActionPreference
 try{
  $ErrorActionPreference='Continue'
  & $script:git -C $repo @argsList 1>$null 2>$null
  $code=$LASTEXITCODE
 }finally{$ErrorActionPreference=$old}
 return $code
}
function CurrentHead{
 if(-not (Test-Path -LiteralPath $repo -PathType Container)){throw 'JREI_APP_REPO_NOT_FOUND'}
 $script:git=(Get-Command git.exe -ErrorAction Stop).Source
 $url=Git -argsList @('remote','get-url','origin')
 if($url -cne $remote -and $url -cne ($remote+'.git')){throw 'JREI_APP_WRONG_ORIGIN'}
 if((Git -argsList @('branch','--show-current')) -cne $branch){throw 'JREI_APP_WRONG_BRANCH'}
 if((GitExit -argsList @('diff','--quiet','--exit-code')) -ne 0 -or
    (GitExit -argsList @('diff','--cached','--quiet','--exit-code')) -ne 0){
   throw 'JREI_APP_LOCAL_TRACKED_CHANGES_PRESERVED'
 }
 $sha=Git -argsList @('rev-parse','HEAD')
 if($sha -cnotmatch '^[0-9a-f]{40}$'){throw 'JREI_APP_HEAD_INVALID'}
 # Never activate local-only or diverged commits, only the pinned origin.
 $synced=Git -argsList @('rev-parse',
     'refs/remotes/origin/migration/bertina-linux6')
 if($sha -cne $synced){throw 'JREI_APP_HEAD_NOT_CANONICAL_REMOTE'}
 return $sha
}
function SourceTree([string]$sha){
 if($sha -cnotmatch '^[a-f0-9]{40}$'){throw 'JREI_APP_SOURCE_SHA_INVALID'}
 $spec=$sha+':platform/jrei-python'
 $tree=Git -argsList @('rev-parse',$spec)
 if($tree -cnotmatch '^[a-f0-9]{40}$'){throw 'JREI_APP_SOURCE_TREE_INVALID'}
 return $tree
}
function InstalledTree([object]$state){
 if($null -eq $state){return ''}
 if($state.sourceTree -cmatch '^[a-f0-9]{40}$'){return [string]$state.sourceTree}
 $prior=[string]$state.sourceCommit
 if($prior -notmatch '^[a-f0-9]{40}$'){return ''}
 try{return SourceTree $prior}catch{return ''}
}
function StaticPreflight([string]$snapshot){
 if(-not (Test-Path -LiteralPath $py -PathType Leaf)){throw 'JREI_APP_PYTHON_MISSING'}
 # Parse staged Python source as data, never importing new JREI modules.
 $validator=@'
import ast,pathlib,sys
root=pathlib.Path(sys.argv[1]).resolve(strict=True)
if not root.is_dir() or not (root/'jrei_service'/'windows_command_center.py').is_file():
    raise SystemExit(15)
files=sorted(root.rglob('*.py'))
if not files or len(files)>2000:
    raise SystemExit(16)
for candidate in files:
    if (candidate.is_symlink() or not candidate.is_file() or
        not candidate.resolve(strict=True).is_relative_to(root) or
        candidate.stat().st_size>1000000):
        raise SystemExit(17)
    ast.parse(candidate.read_text(encoding='utf-8-sig'),filename=str(candidate))
'@
 $oldPreference=$ErrorActionPreference
 try{
  $ErrorActionPreference='Continue'
  & $py -I -B -c $validator $snapshot 1>$null 2>$null
  $result=$LASTEXITCODE
 }finally{$ErrorActionPreference=$oldPreference}
 if($result -ne 0){throw 'JREI_APP_SOURCE_STATIC_PREFLIGHT_REJECTED'}
 Report 'WINDOWS_APP_SOURCE_STATIC_PREFLIGHT_PASSED'
}
function OwnerTask{
 $task=Get-ScheduledTask -TaskName $taskName -ErrorAction Stop
 $principal=[string]$task.Principal.UserId
 try{
  if($principal -match '^S-1-[0-9]+(-[0-9]+)+$'){
   $sid=(New-Object -TypeName System.Security.Principal.SecurityIdentifier -ArgumentList $principal).Value
  }else{
   $sid=(New-Object -TypeName System.Security.Principal.NTAccount -ArgumentList $principal).Translate(
    [Security.Principal.SecurityIdentifier]).Value
  }
 }catch{throw 'JREI_APP_TASK_OWNER_UNRESOLVED'}
 if($sid -cne $owner.User.Value){throw 'JREI_APP_WRONG_TASK_OWNER'}
 if($task.Actions.Count -ne 1){throw 'JREI_APP_UNEXPECTED_TASK_ACTIONS'}
 $a=$task.Actions[0]
 if($a.Arguments -cne '-B -m jrei_service.windows_command_center --serve' -or
    [IO.Path]::GetFullPath([string]$a.Execute) -ine [IO.Path]::GetFullPath($py)){
  throw 'JREI_APP_ORIGINAL_TASK_CHANGED'
 }
 return $task
}
function LocalApi([string]$endpoint){
 if(-not (Test-Path -LiteralPath $tokenFile -PathType Leaf)){
  throw 'JREI_APP_LOCAL_TOKEN_MISSING'
 }
 $token=(Get-Content -LiteralPath $tokenFile -Raw -Encoding Ascii).Trim()
 if($token -cnotmatch '^[A-Za-z0-9_-]{50,128}$'){
  throw 'JREI_APP_LOCAL_TOKEN_INVALID'
 }
 return Invoke-RestMethod -Method Get -Uri ('http://127.0.0.1:8092'+$endpoint) -TimeoutSec 6 -Headers @{
  Authorization=('Bearer '+$token)
 }
}
function IsIdle{
 try{
  $status=LocalApi '/api/status'
  if($status.schema -cne 'jr.jrei.windows-command-center.v2' -or
     $status.busy -ne $false -or $status.owner_activity_recent -ne $false){return $false}
  $tasks=LocalApi '/api/tasks'
  foreach($item in @($tasks.items)){
   if($item.status -in @('QUEUED','RUNNING','CANCEL_REQUESTED')){return $false}
  }
  $images=LocalApi '/api/site-images/jobs'
  foreach($item in @($images.items)){
   if($item.state -eq 'RUNNING'){return $false}
  }
  return $true
 }catch{return $false}
}
function IsReady([string]$expectedSha=''){
 try{
  $status=LocalApi '/api/status'
  if($status.schema -cne 'jr.jrei.windows-command-center.v2' -or
     $status.owner_private -ne $true){return $false}
  if($expectedSha -and $status.windows_app_source_commit -cne $expectedSha){return $false}
  return $true
 }catch{return $false}
}
function Stage([string]$sha){
 if($sha -cnotmatch '^[a-f0-9]{40}$'){throw 'JREI_APP_SHA_INVALID'}
 $tree=SourceTree $sha
 $target=Join-Path $versions $sha
 $snapshot=Join-Path $target 'source\platform\jrei-python'
 $receipt=Join-Path $target 'receipt.json'
 $prior=ReadJson $receipt
 if($prior -and $prior.sourceCommit -ceq $sha -and
    $prior.sourceTree -ceq $tree -and
    $prior.staticPreflightPassed -eq $true -and
    $prior.schema -ceq 'jr.jrei.owner-app-snapshot.v1' -and
    (Test-Path -LiteralPath (Join-Path $snapshot 'jrei_service\windows_command_center.py') -PathType Leaf)){
  return $snapshot
 }
 if(Test-Path -LiteralPath $target){throw 'JREI_APP_INCOMPLETE_SNAPSHOT_PRESERVED'}
 New-Item -ItemType Directory -Path $target -Force|Out-Null
 $archive=Join-Path $target 'canonical-source.zip'
 $extract=Join-Path $target 'source'
 New-Item -ItemType Directory -Path $extract -Force|Out-Null
 $old=$ErrorActionPreference
 try{
  $ErrorActionPreference='Continue'
  & $script:git -C $repo archive --format=zip "--output=$archive" $sha platform/jrei-python 1>$null 2>$null
  $code=$LASTEXITCODE
 }finally{$ErrorActionPreference=$old}
 if($code -ne 0){throw 'JREI_APP_ARCHIVE_FAILED'}
 Expand-Archive -LiteralPath $archive -DestinationPath $extract -ErrorAction Stop
 foreach($relative in @('jrei_service\windows_command_center.py','jrei_service\windows_owner_ui.html')){
  if(-not (Test-Path -LiteralPath (Join-Path $snapshot $relative) -PathType Leaf)){
   throw 'JREI_APP_SNAPSHOT_INCOMPLETE'
  }
 }
 # Successful static parsing is a preflight, NOT integrated functional QA.
 # A syntax-failed snapshot is left untouched for owner diagnosis.
 StaticPreflight $snapshot
 if((CurrentHead) -cne $sha -or (SourceTree $sha) -cne $tree){
  throw 'JREI_APP_SOURCE_CHANGED_DURING_STAGING'
 }
 WriteJson (Join-Path $snapshot 'jrei-app-release.json') @{
  schema='jr.jrei.owner-windows-app-release.v1';sourceCommit=$sha
 }
 WriteJson $receipt @{
  schema='jr.jrei.owner-app-snapshot.v1';sourceCommit=$sha
  sourceTree=$tree;staticPreflightPassed=$true
  testsRun=$false;websiteDeployed=$false
  createdUtc=[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
 }
 return $snapshot
}
function Promote([string]$sha){
 if(-not (Test-Path -LiteralPath $py -PathType Leaf)){throw 'JREI_APP_PYTHON_MISSING'}
 $task=OwnerTask
 if($task.State -ne 'Running'){throw 'JREI_APP_COMMAND_CENTER_TASK_NOT_RUNNING'}
 if(-not (IsIdle)){
  Report 'WINDOWS_APP_UPDATE_DEFERRED_BUSY'
  if($Mode -eq 'Install'){throw 'JREI_APP_OWNER_INSTALL_HELD_ACTIVE_WORK'}
  return
 }
 $work=Stage $sha
 # No process swap if an owner task began during the source preflight.
 if((CurrentHead) -cne $sha -or -not (IsIdle)){
  Report 'WINDOWS_APP_UPDATE_DEFERRED_BUSY'
  return
 }
 $oldAction=$task.Actions[0]
 if([string]$oldAction.WorkingDirectory -ieq $work){
  if(-not (IsReady $sha)){throw 'JREI_APP_EXISTING_SNAPSHOT_NOT_RESPONDING'}
  WriteJson $installed @{
   schema='jr.jrei.owner-app-installed.v1';sourceCommit=$sha
   sourceTree=(SourceTree $sha);sourcePath=$work
  }
  Report 'WINDOWS_APP_ALREADY_UPDATED'
  return
 }
 $newAction=New-ScheduledTaskAction -Execute $py -Argument '-B -m jrei_service.windows_command_center --serve' -WorkingDirectory $work
 $swapped=$false
 try{
  Stop-ScheduledTask -TaskName $taskName -ErrorAction Stop
  Set-ScheduledTask -TaskName $taskName -Action $newAction -ErrorAction Stop|Out-Null
  $swapped=$true
  Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
  $healthy=$false
  for($i=0;$i -lt 18;$i++){
   if(IsReady $sha){$healthy=$true;break}
   Start-Sleep -Seconds 2
  }
  if(-not $healthy){throw 'JREI_APP_NEW_VERSION_NOT_READY'}
  WriteJson $installed @{
   schema='jr.jrei.owner-app-installed.v1';sourceCommit=$sha
   sourceTree=(SourceTree $sha)
   sourcePath=$work;previousPath=[string]$oldAction.WorkingDirectory
   testsRun=$false;websiteDeployed=$false
  }
  Report 'WINDOWS_APP_NEW_VERSION_STARTED'
 }catch{
  if($swapped){
   try{
    Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    Set-ScheduledTask -TaskName $taskName -Action $oldAction -ErrorAction Stop|Out-Null
    Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
    Report 'WINDOWS_APP_OLD_VERSION_RESTORED'
   }catch{Report 'WINDOWS_APP_ROLLBACK_NEEDS_OWNER_REVIEW'}
  }else{
   Start-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  }
  throw 'JREI_APP_UPDATE_REJECTED'
 }
}
if($Mode -eq 'Check'){
 $head=CurrentHead
 $tree=SourceTree $head
 $consent=ReadJson $marker
 $state=ReadJson $installed
 $running=$false
 try{
  $task=OwnerTask
  if($state -and $task.State -eq 'Running' -and
     [string]$task.Actions[0].WorkingDirectory -ieq [string]$state.sourcePath -and
     (IsReady ([string]$state.sourceCommit))){$running=$true}
 }catch{$running=$false}
 Report $(if($consent -and $consent.enabled -eq $true -and
      $consent.ownerSid -ceq $owner.User.Value){
      'WINDOWS_APP_AUTO_UPDATE_ENABLED'}else{'WINDOWS_APP_AUTO_UPDATE_OFF'})
 if($running -and (InstalledTree $state) -ceq $tree){
  Report 'WINDOWS_APP_SOURCE_TREE_CURRENT'
 }else{
  Report 'WINDOWS_APP_UPDATE_PENDING'
 }
 $blocked=ReadJson $failed
 if($blocked -and $blocked.sourceTree -ceq $tree){
  Report 'WINDOWS_APP_SOURCE_REVIEW_HOLD_ACTIVE'
 }
 return
}
if($Mode -eq 'Disable'){
 if(-not $OwnerApproved){throw 'JREI_APP_OWNER_APPROVAL_REQUIRED'}
 if(Test-Path -LiteralPath $marker){Remove-Item -LiteralPath $marker -Force}
 Report 'WINDOWS_APP_AUTO_UPDATE_DISABLED'
 return
}
if($Mode -eq 'Install'){
 if(-not $OwnerApproved){throw 'JREI_APP_OWNER_APPROVAL_REQUIRED'}
 $head=CurrentHead
 $launcher=Join-Path $repo 'platform\jrei-v5\windows-worker\jrei-command-center-startup.ps1'
 if(-not (Test-Path -LiteralPath $launcher -PathType Leaf)){throw 'JREI_APP_LAUNCHER_MISSING'}
 # A registered scheduled task does not prove the private command
 # center is running. Existing owner tasks can remain registered after a
 # reboot, a failed launch or an earlier source migration. Reinvoke the
 # existing, SID-validated startup installer only when the authenticated
 # local endpoint is not ready. It reconciles the original task action and
 # starts it without clearing private mission history or changing the site.
 if(-not (IsReady)){
  Report 'WINDOWS_APP_RECOVERING_EXISTING_COMMAND_CENTER'
  & $launcher -Mode Install -OwnerApproved
 }
 $null=OwnerTask
 if(-not (IsReady)){
  throw 'JREI_APP_COMMAND_CENTER_RECOVERY_UNAVAILABLE'
 }
 if(-not (Get-ScheduledTask -TaskName 'JREI-Repo-Auto-Sync' -ErrorAction SilentlyContinue)){
  $sync=Join-Path $repo 'platform\jrei-v5\windows-worker\jrei-repo-auto-sync.ps1'
  & $sync -Mode Install -OwnerApproved
 }
 Promote $head
 WriteJson $marker @{
  schema='jr.jrei.windows-app-auto-update.v1';enabled=$true
  ownerSid=$owner.User.Value;approvedUtc=[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
 }
 Report 'WINDOWS_APP_INSTALLED_AND_AUTO_UPDATE_OPTED_IN'
 return
}
$approved=ReadJson $marker
if(-not $approved -or $approved.schema -cne 'jr.jrei.windows-app-auto-update.v1' -or
   $approved.enabled -ne $true -or $approved.ownerSid -cne $owner.User.Value){
 Report 'WINDOWS_APP_UPDATE_NOT_OPTED_IN'
 return
}
$head=CurrentHead
$tree=SourceTree $head
$state=ReadJson $installed
# The owner has ALREADY opted into the original 30-minute app updater.
# This local consent is sufficient for guarded source updates ONLY after
# static validation of the immutable snapshot and rollback-capable health.
# The repository governance JSON remains factually UNACCEPTED until a
# genuine integrated Windows acceptance has been completed.
$approval=ReadJson (Join-Path $repo 'docs\governance\JREI_WINDOWS_OWNER_APP_APPROVED_SOURCE_V1.json')
$integrated=($approval -and
  $approval.schema -ceq 'jr.jrei.windows-owner-app-approval.v1' -and
  $approval.approvedSourceTree -ceq $tree -and
  $approval.integratedAcceptancePassed -eq $true -and
  $approval.ownerApprovedAutomaticPromotion -eq $true)
if(-not $integrated){
 Report 'WINDOWS_APP_GUARDED_OWNER_OPT_IN_NO_INTEGRATED_QA'
}
# Compare PYTHON source trees rather than whole repository commits.
# A website-only commit must never interrupt an unchanged Windows engine.
$already=$false
try{
 $task=OwnerTask
 if($state -and $task.State -eq 'Running' -and
    [string]$task.Actions[0].WorkingDirectory -ieq [string]$state.sourcePath -and
    (IsReady ([string]$state.sourceCommit))){$already=$true}
}catch{$already=$false}
if($already -and (InstalledTree $state) -ceq $tree){
 Report 'WINDOWS_APP_SOURCE_TREE_ALREADY_CURRENT'
 return
}
$bad=ReadJson $failed
if($bad -and $bad.schema -ceq 'jr.jrei.windows-app-failed-source.v1' -and
   $bad.sourceTree -ceq $tree){
 Report 'WINDOWS_APP_FAILED_SOURCE_HELD_UNTIL_CODE_CHANGES'
 return
}
try{
 Promote $head
}catch{
 # Do not endlessly restart/rollback the SAME failing source tree every
 # 30 minutes. A new source tree is eligible on the next successful sync.
 WriteJson $failed @{
  schema='jr.jrei.windows-app-failed-source.v1'
  sourceTree=$tree;sourceCommit=$head
  failedUtc=[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  state='HELD_FOR_REVIEW_UNVERIFIED'
 }
 Report 'WINDOWS_APP_UPDATE_FAILED_OLD_RUNTIME_PRESERVED'
 # The source was not activated; surface a failed updater result.
 exit 23
}
