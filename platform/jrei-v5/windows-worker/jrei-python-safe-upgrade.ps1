#Requires -Version 5.1
<#
JREI Python safe automatic updater, Windows 11, Python 3.13 x64.
ONE-TIME owner consent: -Mode Enable -OwnerApproved.
The existing 30-minute JREI-Repo-Auto-Sync runs -Mode Auto after a clean,
canonical fast-forward. No external downloads or privileged shell bridge.
Each Python SOURCE TREE revision is installed OFFLINE into a new, immutable
venv, tested (full unittest + HTTP canary), and only then promoted by
repointing the EXISTING JREI-Python-Core Scheduler action.
Never touch Qwen (8081), the signed Windows worker key/config, news, DB,
PHP, any original model task, or an active Python runtime with work enabled.
Rollback the Python-only task action on any failed health/start check.
Existing venvs and user files are retained for rollback. No auto cleanup.
#>
[CmdletBinding()]
param(
  [ValidateSet('Check','Enable','Disable','Auto')]
  [string]$Mode='Check',
  [switch]$OwnerApproved
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if($env:OS -ne 'Windows_NT'){throw 'JREI_WINDOWS_ONLY'}
$root=Join-Path $env:LOCALAPPDATA 'JREI-Python'
$repo=Join-Path $root 'repo'
$project=Join-Path $repo 'platform\jrei-python'
$wheelhouse=Join-Path $root 'wheelhouse'
$runtimes=Join-Path $root 'runtimes'
$approved=Join-Path $root 'python-auto-upgrade-approved.json'
$stateFile=Join-Path $root 'python-auto-upgrade-state.json'
$logFile=Join-Path $root 'python-auto-upgrade.log'
$taskName='JREI-Python-Core'
$expectedArgs='-m uvicorn jrei_service.app:app --host 127.0.0.1 --port 8091 --workers 1'
$healthUrl='http://127.0.0.1:8091/internal/v1/health'
$canaryUrl='http://127.0.0.1:8091/internal/v1/worker/arithmetic'
$canonical='migration/bertina-linux6'
$origin='https://github.com/drrezazadeh65/drjavadrezazadeh.com'
function Event([string]$code){
 if($code -notmatch '^[A-Z0-9_]{3,90}$'){throw 'UNSAFE_EVENT_CODE'}
 Write-Output ('[JREI] '+$code)
 if($Mode -in @('Auto','Enable','Disable')){
  try {
   if((Test-Path $logFile) -and (Get-Item $logFile).Length -gt 1048576){
    Move-Item -LiteralPath $logFile -Destination (Join-Path $root 'python-auto-upgrade.previous.log') -Force
   }
   Add-Content -LiteralPath $logFile -Encoding UTF8 -Value ((Get-Date).ToUniversalTime().ToString('o')+' '+$code)
  }catch{Write-Output '[JREI] AUTO_INSTALL_LOG_UNAVAILABLE'}
 }
}
function LocalJson([string]$path){
 if(-not (Test-Path -LiteralPath $path -PathType Leaf)){return $null}
 try{return Get-Content -LiteralPath $path -Raw -Encoding UTF8|ConvertFrom-Json}
 catch{return $null}
}
function Persist([string]$path,[object]$data){
 $temp=$path+'.'+([guid]::NewGuid().ToString('N'))+'.tmp'
 $json=ConvertTo-Json -InputObject $data -Depth 6 -Compress
 try{
  [IO.File]::WriteAllText($temp,$json,[Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $temp -Destination $path -Force
 }finally{
  if(Test-Path -LiteralPath $temp){Remove-Item -LiteralPath $temp -Force}
 }
}
function Git([string[]]$arguments){
 $out=& $script:gitExe -C $script:repo @arguments 2>$null
 if($LASTEXITCODE -ne 0){throw 'JREI_AUTO_INSTALL_GIT_VALIDATION_FAILED'}
 return @($out)
}
function GitPass([string[]]$arguments){
 & $script:gitExe -C $script:repo @arguments 1>$null 2>$null
 return $LASTEXITCODE -eq 0
}
function VerifyRepo{
 if(-not (Test-Path -LiteralPath $project -PathType Container)){throw 'JREI_PYTHON_SOURCE_MISSING'}
 $script:gitExe=(Get-Command git.exe -ErrorAction Stop).Source
 if(-not [IO.Path]::IsPathRooted($script:gitExe)){throw 'JREI_GIT_PATH_INVALID'}
 $url=(Git -arguments @('remote','get-url','origin')|Out-String).Trim()
 if($url -cne $origin -and $url -cne ($origin+'.git')){throw 'JREI_REPO_ORIGIN_CHANGED'}
 $branch=(Git -arguments @('branch','--show-current')|Out-String).Trim()
 if($branch -cne $canonical){throw 'JREI_REPO_BRANCH_CHANGED'}
 if(-not (GitPass -arguments @('diff','--quiet','--exit-code')) -or
    -not (GitPass -arguments @('diff','--cached','--quiet','--exit-code'))){
   throw 'JREI_UNCOMMITTED_SOURCE_PRESERVED'
 }
 $tree=(Git -arguments @('rev-parse','HEAD:platform/jrei-python')|Out-String).Trim()
 if($tree -notmatch '^[a-f0-9]{40,64}$'){throw 'JREI_INVALID_SOURCE_TREE'}
 return $tree.ToLowerInvariant()
}
function ExistingPythonTask {
 $task=Get-ScheduledTask -TaskName $taskName -ErrorAction Stop
 if($task.Actions.Count -ne 1){throw 'JREI_UNEXPECTED_PYTHON_TASK_ACTIONS'}
 $a=$task.Actions[0]
 if(($a.Arguments+'').Trim() -cne $expectedArgs){throw 'JREI_PYTHON_TASK_ARGUMENTS_CHANGED'}
 $target=[IO.Path]::GetFullPath([Environment]::ExpandEnvironmentVariables($a.Execute))
 $base=[IO.Path]::GetFullPath((Join-Path $root 'venv\Scripts\python.exe'))
 $prefix=[IO.Path]::GetFullPath($runtimes)+[IO.Path]::DirectorySeparatorChar
 if(-not ($target -ieq $base -or
     ($target.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase) -and
      $target.EndsWith('\Scripts\python.exe',[StringComparison]::OrdinalIgnoreCase)))){
   throw 'JREI_PYTHON_TASK_TARGET_NOT_OWNED'
 }
 if(-not (Test-Path -LiteralPath $target -PathType Leaf)){throw 'JREI_TASK_PYTHON_EXE_MISSING'}
 return $a
}
function Health([switch]$RequireCanary){
 try{
  $h=Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 5
  if($h.schema -cne 'jr.jrei.python-health.v1' -or
      $h.service -cne 'jrei-private-python' -or
      $h.service_process -cne 'RESPONDING' -or
      $h.production_ready -ne $false){return $false}
  if(-not $RequireCanary){return $true}
  $body='{"schema_version":"jr.jrei.arithmetic-request.v1","expression":"12*7"}'
  $r=Invoke-RestMethod -Uri $canaryUrl -Method Post -Body $body `
    -ContentType 'application/json' -TimeoutSec 5
  return $r.schema_version -ceq 'jr.jrei.arithmetic-result.v1' -and
         $r.numerator -eq 84 -and $r.denominator -eq 1 -and
         $r.exact_fraction -ceq '84' -and $r.performed_without_model -eq $true
 }catch{return $false}
}
function WaitHealth([switch]$RequireCanary){
 for($i=0;$i -lt 16;$i++){
  if(Health -RequireCanary:$RequireCanary){return $true}
  Start-Sleep -Seconds 2
 }
 return $false
}
function RunChecked([string]$exe,[string[]]$arguments,[string]$output,[string]$error){
 # Native argv invocation avoids Start-Process ExitCode race / argv flattening
 # under Windows PowerShell 5.1. Task Scheduler has a bounded total run time.
 $prior=$ErrorActionPreference
 $ErrorActionPreference='Continue'
 $code=1
 try{
  & $exe @arguments 1>$output 2>$error
  $code=$LASTEXITCODE
 }finally{
  $ErrorActionPreference=$prior
 }
 if($code -ne 0){throw 'JREI_OFFLINE_PACKAGE_COMMAND_FAILED'}
}
function Stage([string]$tree){
 if(-not (Test-Path $wheelhouse -PathType Container)){throw 'JREI_OFFLINE_WHEELHOUSE_NOT_FOUND'}
 $basePy=(Join-Path $root 'venv\Scripts\python.exe')
 if(-not (Test-Path $basePy -PathType Leaf)){throw 'JREI_INITIAL_PYTHON_RUNTIME_MISSING'}
 # The already VERIFIED Python 3.13 venv supplies the interpreter.
 # Do not require py.exe availability in non-interactive Scheduled Tasks.
 $launcher=$basePy
 $baseVersion=(& $launcher -c "import sys; print(str(sys.version_info.major)+'.'+str(sys.version_info.minor)+'.'+str(sys.maxsize>2**32))")
 if($LASTEXITCODE -ne 0 -or $baseVersion.Trim() -cne '3.13.True'){
   throw 'JREI_BASE_PYTHON_313_X64_REQUIRED'
 }
 $venv=Join-Path $runtimes ('py-'+$tree.Substring(0,16))
 $py=Join-Path $venv 'Scripts\python.exe'
 # A failed/incomplete staging directory must NOT be trusted. No deletion:
 # use a unique new suffix after failed staged versions to avoid overwrite.
 if(Test-Path -LiteralPath $venv){
  $venv=Join-Path $runtimes ('py-'+$tree.Substring(0,16)+'-'+[guid]::NewGuid().ToString('N').Substring(0,8))
  $py=Join-Path $venv 'Scripts\python.exe'
 }
 $stdout=Join-Path $root 'python-upgrade-command.out.log'
 $stderr=Join-Path $root 'python-upgrade-command.err.log'
 $wheelDir=Join-Path $venv 'built-wheels'
 New-Item -ItemType Directory -Force -Path $runtimes,$wheelDir|Out-Null
 # Existing virtualenv and Qwen are not modified during staging.
 # Native invocation preserves Windows path arguments without command-line
 # reparsing. A failure leaves the original running Python untouched.
 & $launcher -m venv $venv 1>$stdout 2>$stderr
 if($LASTEXITCODE -ne 0){throw 'JREI_STAGING_VENV_CREATION_FAILED'}
 Event 'PYTHON_STAGING_VENV_CREATED' | Out-Null
 # Building from reviewed tracked source, using ONLY locally available wheels.
 RunChecked $py @('-m','pip','wheel','--no-index','--disable-pip-version-check',
    '--find-links',$wheelhouse,'--wheel-dir',$wheelDir,'--no-deps',$project) $stdout $stderr
 Event 'PYTHON_STAGING_WHEEL_BUILT' | Out-Null
 $built=@(Get-ChildItem -LiteralPath $wheelDir -Filter 'jrei_intelligence_core-*.whl' -File)
 if($built.Count -ne 1){throw 'JREI_OFFLINE_WHEEL_BUILD_INVALID'}
 RunChecked $py @('-m','pip','install','--no-index','--disable-pip-version-check',
     '--find-links',$wheelhouse,$built[0].FullName) $stdout $stderr
 Event 'PYTHON_STAGING_PACKAGE_INSTALLED' | Out-Null
 $v=(& $py -c "import sys; print(str(sys.version_info.major)+'.'+str(sys.version_info.minor)+'.'+str(sys.maxsize>2**32))")
 if($LASTEXITCODE -ne 0 -or $v.Trim() -cne '3.13.True'){throw 'JREI_STAGED_PYTHON_VERSION_INVALID'}
 # Never import project source via the original working directory; require
 # the isolated runtime's installed package, not the editable repo checkout.
 Push-Location $root
 $prior=$env:PYTHONPATH
 $env:PYTHONPATH=''
 try{
  $importLine="import pathlib,jrei_service.app; p=pathlib.Path(jrei_service.app.__file__).resolve(); base=pathlib.Path(r'$venv').resolve(); assert base in p.parents; print('JREI_ISOLATED_PYTHON_IMPORT_OK')"
  RunChecked $py @('-c',$importLine) $stdout $stderr
  Event 'PYTHON_STAGING_INSTALLED_PACKAGE_IMPORT_PASSED' | Out-Null
  RunChecked $py @('-m','unittest','discover','-s',
     (Join-Path $project 'tests'),'-p','test_*.py','-q') $stdout $stderr
  Event 'PYTHON_STAGING_FULL_TESTS_PASSED' | Out-Null
 }finally{$env:PYTHONPATH=$prior;Pop-Location}
 return @{path=$py;directory=$venv;tree=$tree}
}
try{
 if($Mode -eq 'Disable'){
  if(-not $OwnerApproved){throw 'JREI_OWNER_APPROVAL_REQUIRED'}
  if(Test-Path -LiteralPath $approved){Remove-Item -LiteralPath $approved -Force}
  Event 'PYTHON_AUTO_UPGRADE_DISABLED'
  return
 }
 $tree=VerifyRepo
 $current=ExistingPythonTask
 if($Mode -eq 'Check'){
  $marker=LocalJson $approved
  Event $(if($marker -and $marker.enabled -eq $true){
   'PYTHON_AUTO_UPGRADE_APPROVED'}else{'PYTHON_AUTO_UPGRADE_NOT_APPROVED'})
  $status=LocalJson $stateFile
  Event $(if($status -and $status.sourceTree -ceq $tree){
    'PYTHON_SOURCE_TREE_INSTALLED'}else{'PYTHON_SOURCE_TREE_UPDATE_AVAILABLE'})
  Event $(if(Health){'PYTHON_CORE_RESPONDING'}else{'PYTHON_CORE_NOT_RESPONDING'})
  return
 }
 if($Mode -eq 'Enable'){
  if(-not $OwnerApproved){throw 'JREI_OWNER_APPROVAL_REQUIRED'}
  if(-not (Test-Path -LiteralPath $wheelhouse -PathType Container)){
   throw 'JREI_OFFLINE_WHEELHOUSE_REQUIRED'
  }
  if(-not (Health)){throw 'JREI_EXISTING_PYTHON_NOT_HEALTHY'}
  Persist $approved @{enabled=$true;schema='jr.jrei.windows-python-auto-upgrade.v1';
    approvedAt=[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()}
  Event 'PYTHON_AUTO_UPGRADE_APPROVED'
  Event 'NO_PYTHON_SERVICE_RESTARTED'
  return
 }
 if($Mode -ne 'Auto'){throw 'JREI_AUTO_INSTALL_MODE_INVALID'}
 $marker=LocalJson $approved
 if(-not $marker -or $marker.schema -cne 'jr.jrei.windows-python-auto-upgrade.v1' -or
    $marker.enabled -ne $true){Event 'PYTHON_AUTO_UPGRADE_NOT_APPROVED';return}
 $priorState=LocalJson $stateFile
 if($priorState -and $priorState.sourceTree -ceq $tree){
  Event 'PYTHON_AUTO_UPGRADE_ALREADY_INSTALLED';return
 }
 if($priorState -and $priorState.failedTree -ceq $tree){
  Event 'PYTHON_AUTO_UPGRADE_BLOCKED_FAILED_REVISION';return
 }
 if(-not (Health)){
  Event 'PYTHON_AUTO_UPGRADE_SKIPPED_UNHEALTHY_OLD_CORE';return
 }
 $before=($current.Execute+'')
 $beforeArgs=($current.Arguments+'')
 $beforeDir=($current.WorkingDirectory+'')
 $new=$null
 $changed=$false
 try{
  Event 'PYTHON_OFFLINE_STAGE_STARTED'
  $new=Stage $tree
  # Retest source consistency after build (do not promote dirty/raced code).
  if((VerifyRepo) -cne $tree){throw 'JREI_REPO_CHANGED_DURING_BUILD'}
  Event 'PYTHON_OFFLINE_STAGE_TESTS_PASSED'
  # Python's health reports production_ready=false: the owner-controlled,
  # model-free preview has no active educational/News mission lease.
  if(-not (Health)){throw 'JREI_RUNNING_PYTHON_BECAME_UNHEALTHY'}
  $oldTask=Get-ScheduledTask -TaskName $taskName
  if($oldTask.State -ne 'Running'){throw 'JREI_PYTHON_TASK_NOT_RUNNING'}
  Stop-ScheduledTask -TaskName $taskName -ErrorAction Stop
  # From here onward every failure MUST restore the old Python task, even
  # if an unowned listener prevents the candidate from binding port 8091.
  $changed=$true
  Start-Sleep -Seconds 3
  if(Health){throw 'JREI_UNOWNED_PYTHON_LISTENER_STILL_RUNNING'}
  $next=New-ScheduledTaskAction -Execute $new.path -Argument $expectedArgs -WorkingDirectory $root
  Set-ScheduledTask -TaskName $taskName -Action $next|Out-Null
  # Deliberate rollback fault injection is gated to the disposable GitHub
  # CI fixture. It is not an owner setting or a general remote command.
  if($env:GITHUB_ACTIONS -eq 'true' -and
     $env:JREI_UPGRADE_FIXTURE_DIAGNOSTICS -eq 'CI_ISOLATED' -and
     $env:JREI_UPGRADE_FIXTURE_FAIL_AFTER_SWITCH -eq 'CI_ONLY'){
    throw 'JREI_CI_INJECTED_ROLLBACK_CHECK'
  }
  Start-ScheduledTask -TaskName $taskName
  if(-not (WaitHealth -RequireCanary)){throw 'JREI_NEW_PYTHON_HEALTH_OR_EXACT_SKILL_FAILED'}
  Persist $stateFile @{
   schema='jr.jrei.windows-python-installed.v1';sourceTree=$tree;
   runtimePath=$new.path; installedAt=[DateTimeOffset]::UtcNow.ToUnixTimeSeconds();
   previousRuntime=$before; rollbackAvailable=$true
  }
  Event 'PYTHON_AUTO_UPGRADE_ACTIVATED_AND_VERIFIED'
 }catch{
  $reason=$_.Exception.Message
  if($reason -match '^[A-Z0-9_]{5,65}$'){
   Event ('PYTHON_UPGRADE_REASON_'+$reason)
  }elseif($env:JREI_UPGRADE_FIXTURE_DIAGNOSTICS -eq 'CI_ISOLATED'){
   Write-Output ('CI_PRIVATE_FIXTURE_FAILURE='+$reason)
  }
  if($changed){
   Event 'PYTHON_AUTO_UPGRADE_ROLLBACK_STARTED'
   try{
    Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    $old=New-ScheduledTaskAction -Execute $before -Argument $beforeArgs -WorkingDirectory $beforeDir
    Set-ScheduledTask -TaskName $taskName -Action $old|Out-Null
    Start-ScheduledTask -TaskName $taskName
    if(WaitHealth){Event 'PYTHON_AUTO_UPGRADE_OLD_CORE_RESTORED'}
    else{Event 'PYTHON_AUTO_UPGRADE_MANUAL_RECOVERY_REQUIRED'}
   }catch{Event 'PYTHON_AUTO_UPGRADE_MANUAL_RECOVERY_REQUIRED'}
  }
  Persist $stateFile @{schema='jr.jrei.windows-python-installed.v1';
     sourceTree=if($priorState){$priorState.sourceTree}else{''};
     failedTree=$tree; failedAt=[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()}
  Event 'PYTHON_AUTO_UPGRADE_FAILED_OLD_CORE_PRESERVED'
 }
}catch{
 Event 'PYTHON_AUTO_UPGRADE_PRECHECK_FAILED_NO_SERVICE_CHANGE'
 throw
}
