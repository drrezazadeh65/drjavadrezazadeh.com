#Requires -Version 5.1
<#
 Single-owner-action activation orchestrator for the EXISTING JREI Windows AI.
 Run ONLY on owner PC after code freeze and acceptance; no site deployment.
 Reuses current repo, scheduled-task installer, original 30-min repo sync,
 the existing private JREI dashboard and approved code-only runtime.
 No Qwen deletion, no data wipe, no GitHub token creation, no elevated admin.
#>
[CmdletBinding()]
param([ValidateSet('Install','Status')][string]$Mode='Status',
      [switch]$OwnerApproved)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if($env:OS -cne 'Windows_NT'){throw 'JREI_WINDOWS_REQUIRED'}
$repo=Join-Path $env:LOCALAPPDATA 'JREI-Python\repo'
$scripts=Join-Path $repo 'platform\jrei-v5\windows-worker'
$sync=Join-Path $scripts 'jrei-repo-auto-sync.ps1'
$app=Join-Path $scripts 'jrei-windows-app-auto-update.ps1'
function InvokeStep([string]$file,[string]$task,[bool]$approved){
 if(-not (Test-Path -LiteralPath $file -PathType Leaf)){
  throw 'JREI_STEP_NOT_IN_CANONICAL_REPOSITORY'
 }
 $exe=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
 $arguments=@('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass',
              '-File',$file,'-Mode',$task)
 if($approved){$arguments+=('-OwnerApproved')}
 $prior=$ErrorActionPreference
 try{
  $ErrorActionPreference='Continue'
  & $exe @arguments
  $code=$LASTEXITCODE
 }finally{$ErrorActionPreference=$prior}
 if($code -ne 0){throw 'JREI_STEP_NOT_COMPLETED'}
}
if($Mode -eq 'Status'){
 $readiness=Join-Path $scripts 'jrei-windows-release-readiness.ps1'
 if(-not (Test-Path -LiteralPath $readiness -PathType Leaf)){
  throw 'JREI_RELEASE_READINESS_SCRIPT_NOT_FOUND'
 }
 & $readiness
 Write-Output '[JREI] NATIVE_GENERAL_LANGUAGE_MODEL_NOT_YET_VERIFIED'
 return
}
if(-not $OwnerApproved){throw 'JREI_OWNER_APPROVAL_REQUIRED'}
# A first-class owner action. Existing source transfer is fast-forward only,
# and no rollback/destructive forced checkout is permitted.
InvokeStep $sync 'Sync' $false
# The canonical source is a CANDIDATE until the single final integrated
# Windows acceptance explicitly approves this exact source TREE. Do not
# equate clone/sync success with running the new owner app.
$git=(Get-Command git.exe -CommandType Application -ErrorAction Stop).Source
$sourceSha=(& $git -C $repo rev-parse HEAD | Out-String).Trim()
$sourceTree=(& $git -C $repo rev-parse 'HEAD:platform/jrei-python' | Out-String).Trim()
if($sourceSha -cnotmatch '^[a-f0-9]{40}$' -or
   $sourceTree -cnotmatch '^[a-f0-9]{40}$'){
 throw 'JREI_RELEASE_SOURCE_REVISION_INVALID'
}
$approved=Join-Path $repo 'docs\governance\JREI_WINDOWS_OWNER_APP_APPROVED_SOURCE_V1.json'
$acceptance=$null
if(Test-Path -LiteralPath $approved -PathType Leaf){
 if((Get-Item -LiteralPath $approved).Length -gt 5000){
  throw 'JREI_RELEASE_ACCEPTANCE_LEDGER_TOO_LARGE'
 }
 try{
  $acceptance=Get-Content -LiteralPath $approved -Raw -Encoding UTF8 |
   ConvertFrom-Json
 }catch{throw 'JREI_RELEASE_ACCEPTANCE_LEDGER_INVALID'}
}
if(-not $acceptance -or
   $acceptance.schema -cne 'jr.jrei.windows-owner-app-approval.v1' -or
   $acceptance.approvedSourceTree -cne $sourceTree -or
   $acceptance.integratedAcceptancePassed -ne $true -or
   $acceptance.ownerApprovedAutomaticPromotion -ne $true){
 Write-Output '[JREI] NEW_CODE_DOWNLOADED_OR_ALREADY_PRESENT'
 Write-Output '[JREI] INTEGRATED_ACCEPTANCE_FOR_THIS_SOURCE_NOT_APPROVED'
 Write-Output '[JREI] EXISTING_OWNER_APP_PRESERVED'
 Write-Output '[JREI] NO_MODEL_OR_WEBSITE_CHANGE'
 throw 'JREI_RELEASE_CANDIDATE_HELD_FOR_FINAL_INTEGRATED_ACCEPTANCE'
}
function GetOwnerPanel {
 $tokenPath=Join-Path $env:LOCALAPPDATA 'JREI\command-center\owner-token'
 if(-not (Test-Path -LiteralPath $tokenPath -PathType Leaf)){return $null}
 try{
  $secret=(Get-Content -LiteralPath $tokenPath -Encoding Ascii -Raw).Trim()
  if($secret -cnotmatch '^[A-Za-z0-9_-]{50,128}$'){return $null}
  $status=Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:8092/api/status' -TimeoutSec 6 -Headers @{
   Authorization=('Bearer '+$secret)
  }
  if($status.schema -cne 'jr.jrei.windows-command-center.v2' -or
     $status.owner_private -ne $true){return $null}
  return $status
 }catch{return $null}
}
$current=GetOwnerPanel
if($current -and $current.windows_app_source_commit -ceq $sourceSha){
 Write-Output '[JREI] REVIEWED_SOURCE_ALREADY_RUNNING'
}else{
 Write-Output '[JREI] REVIEWED_OWNER_APP_PROMOTION_REQUESTED'
 # Original app updater will refuse an active owner session or pending job;
 # it snapshots the reviewed version and restores the prior task on failure.
 InvokeStep $app 'Install' $true
 $running=GetOwnerPanel
 if(-not $running -or $running.windows_app_source_commit -cne $sourceSha){
  throw 'JREI_REVIEWED_VERSION_NOT_RUNNING_AFTER_INSTALL'
 }
 Write-Output '[JREI] REVIEWED_SOURCE_PROMOTED_AND_AUTHENTICATED'
}
Write-Output '[JREI] OWNER_PRIVATE_APP_SOURCE_SHA='+$sourceSha
Write-Output '[JREI] NO_THIRD_PARTY_MODELS_INSTALLED'
Write-Output '[JREI] TRAINED_NATIVE_LLM_STATUS_NOT_ASSUMED'
Write-Output '[JREI] SECOND_PC_REQUIRES_SEPARATE_OWNER_INSTALL'
Write-Output '[JREI] WEBSITE_BERTINA_DEPLOY_UNCHANGED'
