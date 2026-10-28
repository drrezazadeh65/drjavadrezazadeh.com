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
 InvokeStep $app 'Check' $false
 Write-Output '[JREI] NATIVE_LANGUAGE_MODEL_NOT_TRAINED'
 return
}
if(-not $OwnerApproved){throw 'JREI_OWNER_APPROVAL_REQUIRED'}
# A first-class owner action. Existing source transfer is fast-forward only,
# and no rollback/destructive forced checkout is permitted.
InvokeStep $sync 'Sync' $false
# A healthy, authenticated JREI panel is already installed. Avoid stopping
# active owner work solely to promote the app while installing a language
# model. App promotion and language-model activation are independent.
function ExistingPanelReady {
 $tokenPath=Join-Path $env:LOCALAPPDATA 'JREI\command-center\owner-token'
 if(-not (Test-Path -LiteralPath $tokenPath -PathType Leaf)){return $false}
 try{
  $secret=(Get-Content -LiteralPath $tokenPath -Encoding Ascii -Raw).Trim()
  if($secret -cnotmatch '^[A-Za-z0-9_-]{50,128}$'){return $false}
  $status=Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:8092/api/status' -TimeoutSec 6 -Headers @{
   Authorization=('Bearer '+$secret)
  }
  return ($status.schema -ceq 'jr.jrei.windows-command-center.v2' -and
          $status.owner_private -eq $true)
 }catch{return $false}
}
if(ExistingPanelReady){
 Write-Output '[JREI] EXISTING_PRIVATE_COMMAND_CENTER_RESPONDING'
 Write-Output '[JREI] APP_PROMOTION_DEFERRED_NO_ACTIVE_WORK_INTERRUPTED'
}else{
 InvokeStep $app 'Install' $true
 if(-not (ExistingPanelReady)){throw 'JREI_EXISTING_PRIVATE_APP_NOT_READY'}
}
# Source libraries, infrastructure and the owner dashboard do not constitute
# a trained native language model. Never fetch or activate any other vendor's
# pretrained weights through this installer. JREI-owned, provenance-verified
# training and an approved native checkpoint are separate future stages.
Write-Output '[JREI] NO_THIRD_PARTY_MODEL_DOWNLOADS_OR_RUNTIME_ACTIVATION'
Write-Output '[JREI] JREI_NATIVE_MODEL_WEIGHTS_NOT_YET_TRAINED'
Write-Output '[JREI] OWNER_DASHBOARD_AND_SOURCE_STEPS_COMPLETED'
Write-Output '[JREI] SECOND_PC_NOT_REMOTE_INSTALLED'
Write-Output '[JREI] WEBSITE_BERTINA_DEPLOY_UNCHANGED'
