#Requires -Version 5.1
<#
 Optional, limited-privilege JREI autonomous learning supervisor.
 A standing owner grant allows sandbox proposals across logons; the task
 NEVER touches Bertina, payments, other user data or production deployment.
 No software/model download, no firewall changes, no admin elevation.
#>
[CmdletBinding()]
param(
 [ValidateSet('Install','Run','Status','Remove')][string]$Mode='Status',
 [string]$ManifestPath,
 [string]$WorkspacePath,
 [string]$PublicKeyB64,
 [switch]$OwnerApproved
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if($env:OS -cne 'Windows_NT'){throw 'AUTOCODE_WINDOWS_ONLY'}
$taskName='JREI-Sandbox-Continuous-Learning'
$root=Join-Path $env:LOCALAPPDATA 'JREI-Python'
$repo=Join-Path $root 'repo'
$venv=Join-Path $root 'venv\Scripts\python.exe'
$project=Join-Path $repo 'platform\jrei-python'
$settingsPath=Join-Path $root 'autocode-settings.v1.json'
$scriptPath=[IO.Path]::GetFullPath($MyInvocation.MyCommand.Path)

function Canonical([string]$value) {
 if([string]::IsNullOrWhiteSpace($value) -or
    -not [IO.Path]::IsPathRooted($value)){
  throw 'AUTOCODE_ABSOLUTE_PATH_REQUIRED'
 }
 return [IO.Path]::GetFullPath($value).TrimEnd('\')
}
function OwnerPrivate([string]$value){
 $full=Canonical $value
 $base=Canonical $repo
 if($full.Equals($base,[StringComparison]::OrdinalIgnoreCase) -or
    $full.StartsWith($base+'\',[StringComparison]::OrdinalIgnoreCase)){
  throw 'AUTOCODE_PRIVATE_PATH_INSIDE_REPOSITORY'
 }
 return $full
}
function ReadSettings {
 if(-not (Test-Path -LiteralPath $settingsPath -PathType Leaf)){
  throw 'AUTOCODE_PRIVATE_SETTINGS_MISSING'
 }
 $s=Get-Content -LiteralPath $settingsPath -Raw |
  ConvertFrom-Json -ErrorAction Stop
 if($s.schema -cne 'jr.jrei.autocode-task-settings.v1'){
  throw 'AUTOCODE_SETTINGS_SCHEMA_UNEXPECTED'
 }
 $manifest=OwnerPrivate ([string]$s.manifest)
 $workspace=OwnerPrivate ([string]$s.workspace)
 if(-not (Test-Path -LiteralPath $manifest -PathType Leaf)){
  throw 'AUTOCODE_SIGNED_MANIFEST_MISSING'
 }
 $key=[string]$s.ownerPublicKeyB64
 if($key -cnotmatch '^[A-Za-z0-9+/]{43}=$'){
  throw 'AUTOCODE_PUBLIC_KEY_INVALID'
 }
 return @{ manifest=$manifest; workspace=$workspace; key=$key }
}
if($Mode -eq 'Status'){
 $registered=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
 Write-Output ('JREI_AUTOCODE_TASK_REGISTERED='+[bool]($null -ne $registered))
 Write-Output ('JREI_AUTOCODE_SETTINGS_PRESENT='+[bool](Test-Path -LiteralPath $settingsPath))
 Write-Output 'JREI_AUTOCODE_EXECUTION_NOT_INDEPENDENTLY_ATTESTED'
 exit 0
}
if($Mode -eq 'Run'){
 $cfg=ReadSettings
 if(-not (Test-Path -LiteralPath $venv -PathType Leaf) -or
    -not (Test-Path -LiteralPath $project -PathType Container)){
  throw 'AUTOCODE_PYTHON_SOURCE_OR_RUNTIME_MISSING'
 }
 $env:JREI_AUTOCODE_OWNER_PUBLIC_KEY_B64=$cfg.key
 $env:JREI_AUTOCODE_CANONICAL_REPO=Canonical $repo
 $env:JREI_AUTOCODE_PRIVATE_WORKSPACE=$cfg.workspace
 $env:JREI_AUTOCODE_OWNER_MANIFEST=$cfg.manifest
 $env:JREI_CONTINUOUS_AUTOCODE_ENABLED='1'
 $env:JREI_PYTHON_OWNER_MODEL_DRAFT_ENABLED='1'
 $env:PYTHONPATH=$project
 # The separate owner model-rights decision is never fabricated here.
 & $venv -m jrei_orchestrator.continuous_autocode
 if($LASTEXITCODE -ne 0){throw 'AUTOCODE_WORKER_STOPPED_WITH_ERROR'}
 exit 0
}
if(-not $OwnerApproved){throw 'AUTOCODE_OWNER_APPROVAL_REQUIRED'}
if($Mode -eq 'Remove'){
 $task=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
 if($null -ne $task){
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
 }
 Write-Output 'AUTOCODE_TASK_REMOVED_PRIVATE_ARTIFACTS_RETAINED'
 exit 0
}
if($Mode -cne 'Install'){throw 'AUTOCODE_MODE_INVALID'}
$manifest=OwnerPrivate $ManifestPath
$workspace=OwnerPrivate $WorkspacePath
if(-not (Test-Path -LiteralPath $manifest -PathType Leaf)){
 throw 'AUTOCODE_SIGNED_MANIFEST_NOT_FOUND'
}
if(-not (Test-Path -LiteralPath $venv -PathType Leaf) -or
   -not (Test-Path -LiteralPath $project -PathType Container)){
 throw 'AUTOCODE_RUNTIME_NOT_STAGED'
}
if($PublicKeyB64 -cnotmatch '^[A-Za-z0-9+/]{43}=$'){
 throw 'AUTOCODE_PUBLIC_KEY_INVALID'
}
if(Test-Path -LiteralPath $settingsPath){throw 'AUTOCODE_SETTINGS_EXIST_REVIEW_FIRST'}
if(Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue){
 throw 'AUTOCODE_TASK_ALREADY_REGISTERED'
}
$null=New-Item -ItemType Directory -Path $workspace -Force
$owner=[Security.Principal.WindowsIdentity]::GetCurrent().Name
$cfg=@{
 schema='jr.jrei.autocode-task-settings.v1'
 manifest=$manifest
 workspace=$workspace
 ownerPublicKeyB64=$PublicKeyB64
 installedBy=$owner
 installedAtUtc=[DateTime]::UtcNow.ToString('o')
 productionAccess=$false
}
[IO.File]::WriteAllText($settingsPath,($cfg|ConvertTo-Json -Depth 4),
 [Text.UTF8Encoding]::new($false))
try{
 $shell=(Get-Command powershell.exe -CommandType Application -ErrorAction Stop).Source
 $argsLine='-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "'+$scriptPath+'" -Mode Run'
 $action=New-ScheduledTaskAction -Execute $shell -Argument $argsLine -WorkingDirectory $project
 $trigger=New-ScheduledTaskTrigger -AtLogOn -User $owner
 $options=New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 0) -MultipleInstances IgnoreNew -StartWhenAvailable:$true -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 2)
 $principal=New-ScheduledTaskPrincipal -UserId $owner -LogonType Interactive -RunLevel Limited
 Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $options -Principal $principal -Description 'JREI isolated code proposals; no live site access' | Out-Null
}catch{
 if(Test-Path -LiteralPath $settingsPath){Remove-Item -LiteralPath $settingsPath}
 throw
}
Write-Output 'AUTOCODE_STANDING_SANDBOX_TASK_REGISTERED_NEXT_LOGON'
Write-Output 'AUTOCODE_NOT_TESTED_NOT_DEPLOYED_NOT_LIVE'
