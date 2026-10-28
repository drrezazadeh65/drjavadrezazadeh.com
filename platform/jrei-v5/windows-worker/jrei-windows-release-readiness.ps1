#Requires -Version 5.1
<#
 JREI Windows owner release-readiness report — READ ONLY.
 No tests, downloads, installations, remote commands, tokens, GPU model
 assumptions, task restarts, website publish or application promotion.
 Report the current machine only. Run independently on each of the two PCs.
#>
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if($env:OS -cne 'Windows_NT'){throw 'JREI_WINDOWS_REQUIRED'}
$root=Join-Path $env:LOCALAPPDATA 'JREI-Python'
$repo=Join-Path $root 'repo'
$private=Join-Path $env:LOCALAPPDATA 'JREI\command-center'
$source=Join-Path $repo 'platform\jrei-python\jrei_service'
$tokenFile=Join-Path $private 'owner-token'
$approval=Join-Path $repo 'docs\governance\JREI_WINDOWS_OWNER_APP_APPROVED_SOURCE_V1.json'
$installed=Join-Path $root 'windows-owner-app-current.json'
$expectedBranch='migration/bertina-linux6'
$expectedOrigin='https://github.com/drrezazadeh65/drjavadrezazadeh.com'
function Say([string]$code,[string]$value) {
 if($code -cnotmatch '^[A-Z_]{2,48}$'){throw 'JREI_READINESS_KEY_INVALID'}
 Write-Output ('[JREI] '+$code+'='+$value)
}
function ReadSmallJson([string]$file){
 if(-not (Test-Path -LiteralPath $file -PathType Leaf)){return $null}
 if((Get-Item -LiteralPath $file).Length -gt 10000){return $null}
 try{return Get-Content -LiteralPath $file -Encoding UTF8 -Raw | ConvertFrom-Json}
 catch{return $null}
}
Say 'MODE' 'READ_ONLY_NO_TEST_NO_DEPLOY'
Say 'DEVICE_SCOPE' 'THIS_WINDOWS_PC_ONLY'
Say 'REPO_SOURCE' $(if(Test-Path -LiteralPath $repo -PathType Container){'PRESENT'}else{'MISSING'})
$head=''
$tree=''
$originOk=$false
$branchOk=$false
$clean=$false
if(Test-Path -LiteralPath $repo -PathType Container){
 try {
  $git=(Get-Command git.exe -CommandType Application -ErrorAction Stop).Source
  $saved=$ErrorActionPreference
  try{
   $ErrorActionPreference='Continue'
   $origin=(& $git -C $repo remote get-url origin 2>$null | Out-String).Trim()
   $branch=(& $git -C $repo branch --show-current 2>$null | Out-String).Trim()
   $head=(& $git -C $repo rev-parse HEAD 2>$null | Out-String).Trim()
   $tree=(& $git -C $repo rev-parse 'HEAD:platform/jrei-python' 2>$null | Out-String).Trim()
   & $git -C $repo diff --quiet --exit-code 1>$null 2>$null
   $workClean=($LASTEXITCODE -eq 0)
   & $git -C $repo diff --cached --quiet --exit-code 1>$null 2>$null
   $indexClean=($LASTEXITCODE -eq 0)
  }finally{$ErrorActionPreference=$saved}
  $originOk=($origin -ceq $expectedOrigin -or $origin -ceq ($expectedOrigin+'.git'))
  $branchOk=($branch -ceq $expectedBranch)
  $clean=($workClean -and $indexClean)
  if($head -cnotmatch '^[a-f0-9]{40}$' -or
     $tree -cnotmatch '^[a-f0-9]{40}$'){$originOk=$false;$branchOk=$false}
 }catch{
  Say 'GIT_CHECK' 'UNAVAILABLE'
 }
}
Say 'CANONICAL_BRANCH' $(if($branchOk){'YES'}else{'NO'})
Say 'CANONICAL_ORIGIN' $(if($originOk){'YES'}else{'NO'})
Say 'TRACKED_SOURCE_CLEAN' $(if($clean){'YES'}else{'NO_OR_UNKNOWN'})
if($head){Say 'SOURCE_SHA' $head}
$expected=@(
 'windows_command_center.py',
 'windows_owner_ui.html',
 'windows_owner_agent.py',
 'windows_native_corpus.py',
 'windows_native_scratch_training.py',
 'windows_native_inference.py',
 'windows_native_sealed_evaluation.py',
 'windows_open_source_discovery.py',
 'windows_office_structures.py',
 'windows_resource_envelope.py'
)
$missing=@($expected | Where-Object {
 -not (Test-Path -LiteralPath (Join-Path $source $_) -PathType Leaf)
})
Say 'OWNER_APP_SOURCE_TREE' $(if($missing.Count -eq 0){'PRESENT'}else{'INCOMPLETE'})
Say 'PYTHON_RUNTIME' $(if(Test-Path -LiteralPath (Join-Path $root 'venv\Scripts\python.exe') -PathType Leaf){'PRESENT'}else{'MISSING'})
Say 'OWNER_PRIVATE_DATABASE' $(if(Test-Path -LiteralPath (Join-Path $private 'missions.sqlite3') -PathType Leaf){'PRESENT'}else{'NOT_FOUND'})
Say 'MODEL_WEIGHTS' 'NOT_ASSUMED_OR_DOWNLOADED'
Say 'GPU_COMPUTE' 'NOT_VERIFIED_BY_READINESS_REPORT'
Say 'REMOTE_SECOND_PC' 'NOT_MEASURED'
$owner=[Security.Principal.WindowsIdentity]::GetCurrent()
$task=Get-ScheduledTask -TaskName 'JREI-Owner-Windows-Command-Center' -ErrorAction SilentlyContinue
$ownerTask=$false
if($null -ne $task){
 try{
  $id=[string]$task.Principal.UserId
  $sid= if($id -match '^S-1-[0-9]+(-[0-9]+)+$'){
   (New-Object -TypeName System.Security.Principal.SecurityIdentifier -ArgumentList $id).Value
  }else{
   (New-Object -TypeName System.Security.Principal.NTAccount -ArgumentList $id).Translate(
    [Security.Principal.SecurityIdentifier]).Value
  }
  $ownerTask=($sid -ceq $owner.User.Value)
 }catch{$ownerTask=$false}
}
Say 'EXISTING_OWNER_SCHEDULED_TASK' $(if($ownerTask){'OWNER_VALIDATED'}elseif($null -eq $task){'ABSENT'}else{'OWNER_NOT_VALIDATED'})
$live=''
if($ownerTask -and (Test-Path -LiteralPath $tokenFile -PathType Leaf)){
 try{
  $secret=(Get-Content -LiteralPath $tokenFile -Encoding Ascii -Raw).Trim()
  if($secret -cmatch '^[A-Za-z0-9_-]{50,128}$'){
   $state=Invoke-RestMethod -Uri 'http://127.0.0.1:8092/api/status' -Method Get -TimeoutSec 4 -Headers @{
    Authorization='Bearer '+$secret
   }
   if($state.schema -ceq 'jr.jrei.windows-command-center.v2' -and
      $state.owner_private -eq $true){
    $live=[string]$state.windows_app_source_commit
    Say 'AUTHENTICATED_PRIVATE_PANEL' 'RESPONDING'
   }
  }
 }catch{}
}
if(-not $live){Say 'AUTHENTICATED_PRIVATE_PANEL' 'NOT_VERIFIED'}
if($live){Say 'LIVE_APP_SOURCE_SHA' $live}
$record=ReadSmallJson $installed
if($record -and $record.schema -ceq 'jr.jrei.owner-app-installed.v1' -and
   $record.sourceCommit -ceq $live -and $live -ceq $head){
 Say 'INSTALLED_VERSION' 'CURRENT_AND_AUTHENTICATED'
}else{
 Say 'INSTALLED_VERSION' 'NOT_CONFIRMED_CURRENT'
}
$approvalRecord=ReadSmallJson $approval
$accepted=($approvalRecord -and
 $approvalRecord.schema -ceq 'jr.jrei.windows-owner-app-approval.v1' -and
 $approvalRecord.approvedSourceTree -ceq $tree -and
 $approvalRecord.integratedAcceptancePassed -eq $true -and
 $approvalRecord.ownerApprovedAutomaticPromotion -eq $true)
Say 'INTEGRATED_ACCEPTANCE' $(if($accepted){'APPROVED_FOR_EXACT_SOURCE_TREE'}else{'NOT_YET_APPROVED'})
Say 'LIVE_SITE_CHANGE' 'NONE'
Say 'FINAL_RESULT' $(if($originOk -and $branchOk -and $clean -and
 $missing.Count -eq 0 -and $accepted){'RELEASE_CANDIDATE_ELIGIBLE_FOR_OWNER_INSTALL'}else{'SOURCE_PREPARATION_ONLY_NOT_RELEASED'})
