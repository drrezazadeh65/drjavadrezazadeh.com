#Requires -Version 5.1
<#
 JREI two-PC per-user installer gate. One shared reviewed UI installer on each
 existing Windows PC; no second AI application/backend/database.
 -Mode Status is read-only (no tests, imports, binaries, networks or processes).
 -Mode Install requires separate explicit owner click and matching final source
 acceptance, exact GitHub commit and SHA256 artifact.
 Never changes the original signed worker keys, source checkout, scheduled
 tasks, background learning, model weights, 8091/8092 or live Bertina.
#>
[CmdletBinding()]
param(
 [ValidateSet('A','B')][string]$Node,
 [ValidateSet('Status','Install')][string]$Mode='Status',
 [string]$ArtifactRoot=$PSScriptRoot,
 [switch]$OwnerApproved
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if($env:OS -cne 'Windows_NT' -or -not [Environment]::Is64BitOperatingSystem){
 throw 'JREI_DUAL_PC_WINDOWS_X64_REQUIRED'
}
if([string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)){throw 'JREI_OWNER_PROFILE_MISSING'}
$repo=Join-Path $env:LOCALAPPDATA 'JREI-Python\repo'
$cfgPath=Join-Path $env:LOCALAPPDATA 'JREI\jrei-worker-config.json'
$acceptancePath=Join-Path $repo 'docs\governance\JREI_WINDOWS_OWNER_APP_APPROVED_SOURCE_V1.json'
$taskName='JREI-Owner-Windows-Command-Center'
$expectedBranch='migration/bertina-linux6'
$expectedOrigin='https://github.com/drrezazadeh65/drjavadrezazadeh.com'
$knownNodeIds=@{
 A='28b1c0d2-b833-41cb-97e2-df92c9373de0'
 B='7f742039-6c42-4cb7-9bd3-044e30b059f7'
}
$minimumRam=@{A=28GB;B=12GB}
function Emit([string]$key,[string]$value) {
 if($key -cnotmatch '^[A-Z0-9_]{3,65}$'){throw 'JREI_DUAL_PC_LOG_KEY_INVALID'}
 Write-Output ('[JREI] '+$key+'='+$value)
}
function SmallJson([string]$file,[long]$limit) {
 if(-not (Test-Path -LiteralPath $file -PathType Leaf)){return $null}
 $item=Get-Item -LiteralPath $file -ErrorAction Stop
 if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){return $null}
 if($item.Length -le 0 -or $item.Length -gt $limit){return $null}
 try{return (Get-Content -LiteralPath $file -Raw -Encoding UTF8 |
               ConvertFrom-Json -ErrorAction Stop)}catch{return $null}
}
function GitText([string[]]$arguments) {
 $previous=$ErrorActionPreference
 try {
  $ErrorActionPreference='Continue'
  $out=& $script:git -C $repo @arguments 2>$null
  $code=$LASTEXITCODE
 }finally{$ErrorActionPreference=$previous}
 if($code -ne 0){throw 'JREI_DUAL_PC_GIT_READ_UNAVAILABLE'}
 return (($out | Out-String).Trim())
}
if(-not (Test-Path -LiteralPath $repo -PathType Container)){
 throw 'JREI_DUAL_PC_CANONICAL_REPOSITORY_MISSING'
}
$script:git=(Get-Command git.exe -CommandType Application -ErrorAction Stop).Source
if((GitText @('remote','get-url','origin')) -cnotin @($expectedOrigin,($expectedOrigin+'.git'))){
 throw 'JREI_DUAL_PC_WRONG_GIT_ORIGIN'
}
if((GitText @('branch','--show-current')) -cne $expectedBranch){
 throw 'JREI_DUAL_PC_WRONG_BRANCH'
}
$head=GitText @('rev-parse','HEAD')
$tree=GitText @('rev-parse','HEAD:platform/jrei-python')
if($head -cnotmatch '^[a-f0-9]{40}$' -or $tree -cnotmatch '^[a-f0-9]{40}$'){
 throw 'JREI_DUAL_PC_UNPINNED_SOURCE'
}
$oldPref=$ErrorActionPreference
try {
 $ErrorActionPreference='Continue'
 & $script:git -C $repo diff --quiet --exit-code 1>$null 2>$null
 $cleanWork=($LASTEXITCODE -eq 0)
 & $script:git -C $repo diff --cached --quiet --exit-code 1>$null 2>$null
 $cleanIndex=($LASTEXITCODE -eq 0)
}finally{$ErrorActionPreference=$oldPref}
if(-not $cleanWork -or -not $cleanIndex){throw 'JREI_DUAL_PC_TRACKED_CHANGES_PRESERVED'}
$config=SmallJson $cfgPath 65536
if($null -eq $config -or $config.protocol -cne 'jr.jrei.windows-worker.v1' -or
   [string]$config.nodeId -cne $knownNodeIds[$Node] -or
   $config.origin -cne 'https://drjavadrezazadeh.com'){
 throw 'JREI_DUAL_PC_EXISTING_SIGNED_NODE_IDENTITY_MISMATCH'
}
$ram=[long](Get-CimInstance Win32_ComputerSystem -ErrorAction Stop).TotalPhysicalMemory
if($ram -lt $minimumRam[$Node]){
 throw 'JREI_DUAL_PC_NODE_MEMORY_ROLE_MISMATCH'
}
$task=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
$existingTask=($null -ne $task)
$approval=SmallJson $acceptancePath 10000
$accepted=(
 $null -ne $approval -and
 $approval.schema -ceq 'jr.jrei.windows-owner-app-approval.v1' -and
 $approval.approvedSourceTree -ceq $tree -and
 $approval.integratedAcceptancePassed -eq $true -and
 $approval.ownerApprovedAutomaticPromotion -eq $true
)
$root=Resolve-Path -LiteralPath $ArtifactRoot -ErrorAction Stop
if(-not (Test-Path -LiteralPath $root.Path -PathType Container)){
 throw 'JREI_DUAL_PC_ARTIFACT_DIRECTORY_MISSING'
}
$manifestPath=Join-Path $root.Path 'installer-manifest.json'
$manifest=SmallJson $manifestPath 10000
$artifactValid=$false
$sha=''
if($null -ne $manifest -and
   $manifest.schema -ceq 'jr.jrei.native-installer-artifact.v1' -and
   $manifest.os -ceq 'windows-x64' -and
   $manifest.signed -eq $false -and
   $manifest.source_commit -ceq $head -and
   [string]$manifest.installer_name -ceq 'JREI-Setup-Windows-x64-v0.1.2.exe' -and
   [string]$manifest.installer_sha256 -cmatch '^[a-f0-9]{64}$'){
 $installer=Join-Path $root.Path 'JREI-Setup-Windows-x64-v0.1.2.exe'
 if(Test-Path -LiteralPath $installer -PathType Leaf){
  $file=Get-Item -LiteralPath $installer -ErrorAction Stop
  if(-not ($file.Attributes -band [IO.FileAttributes]::ReparsePoint) -and
     $file.Length -gt 100000 -and $file.Length -le 200MB){
    $sha=(Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant()
    $artifactValid=($sha -ceq [string]$manifest.installer_sha256)
  }
 }
}
$installerReady=($accepted -and $existingTask -and $artifactValid)
Emit 'NODE_ROLE' $Node
Emit 'EXPECTED_SOURCE_COMMIT' $head
Emit 'NODE_IDENTITY' 'MATCHED_EXISTING_PRIVATE_CONFIG'
Emit 'INSTALLED_BACKEND_TASK' $(if($existingTask){'PRESENT'}else{'MISSING'})
Emit 'FINAL_PYTHON_TREE_ACCEPTANCE' $(if($accepted){'RECORDED_FOR_THIS_TREE'}else{'NOT_ACCEPTED'})
Emit 'UI_INSTALLER_SHA256' $(if($artifactValid){'MATCHED'}else{'NOT_PRESENT_OR_MISMATCH'})
Emit 'SAFE_TO_REQUEST_GUI_INSTALL' $(if($installerReady){'YES'}else{'NO'})
Emit 'SIGNED_WORKER_CHANGED' 'NO'
Emit 'MODEL_WEIGHTS_CHANGED' 'NO'
Emit 'WEBSITE_DEPLOYED' 'NO'
if($Mode -eq 'Status'){
 Emit 'STATUS' 'READ_ONLY_NO_WINDOWS_INSTALL_NO_TEST'
 return
}
if(-not $OwnerApproved){throw 'JREI_DUAL_PC_EXPLICIT_OWNER_APPROVAL_REQUIRED'}
if(-not $installerReady){throw 'JREI_DUAL_PC_INSTALL_HELD_FOR_FINAL_ACCEPTANCE_OR_MISSING_ARTIFACT'}
# Reuse the ORIGINAL accepted and rollback-capable owner-private 8092
# updater. Never create another service, shadow database, model or scheduler.
# The existing updater checks owner-idle/task state and restores the previous
# scheduled action if the candidate does not become responsive.
$updater=Join-Path $repo 'platform\jrei-v5\windows-worker\jrei-windows-app-auto-update.ps1'
if(-not (Test-Path -LiteralPath $updater -PathType Leaf)){
 throw 'JREI_DUAL_PC_ORIGINAL_PRIVATE_BACKEND_UPDATER_MISSING'
}
$ps=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
if(-not (Test-Path -LiteralPath $ps -PathType Leaf)){
 throw 'JREI_DUAL_PC_TRUSTED_POWERSHELL_MISSING'
}
Emit 'BACKEND_STEP' 'REQUEST_ORIGINAL_ACCEPTED_PRIVATE_SOURCE_PROMOTION'
& $ps -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $updater -Mode Install -OwnerApproved
$upgradeResult=$LASTEXITCODE
if($upgradeResult -ne 0){
 throw 'JREI_DUAL_PC_BACKEND_UPGRADE_FAILED_OR_DEFERRED_OLD_RUNTIME_PRESERVED'
}
# Launch the NORMAL INNO UI, never silently and never elevated. The owner
# controls Windows installer prompts. Exit-code 0 establishes only a
# successful GUI package installation, not model or multi-node acceptance.
$process=Start-Process -FilePath $installer -Wait -PassThru -ErrorAction Stop
if($process.ExitCode -ne 0){throw 'JREI_DUAL_PC_UI_INSTALLER_NONZERO_EXIT'}
$gui=Join-Path $env:LOCALAPPDATA 'Programs\JREI\JREI.exe'
if(-not (Test-Path -LiteralPath $gui -PathType Leaf)){
 throw 'JREI_DUAL_PC_GUI_EXECUTABLE_NOT_PRESENT_AFTER_INSTALL'
}
Emit 'INSTALL_RESULT' 'GUI_ONLY_PRESENT_UNVERIFIED_BACKEND'
Emit 'NEXT_GATE' 'ORIGINAL_PER_NODE_INTEGRATED_ACCEPTANCE'
