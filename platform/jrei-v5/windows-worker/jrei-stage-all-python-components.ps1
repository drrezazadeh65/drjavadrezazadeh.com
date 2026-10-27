#Requires -Version 5.1
<#
  JREI add-only Python source staging for the owner's EXISTING Windows host.
  Explicit -Mode Install -OwnerApproved is required; Check is read-only.
  This installs ALL modules declared in the canonical pyproject.toml into a
  NEW isolated virtualenv without running tests, importing the application,
  modifying the active JREI-Python-Core action, or touching Qwen/keys/MySQL.
  Staged != accepted for live use. Original reviewed source-tree approval
  still governs subsequent guarded Python activation and fail-safe rollback.
  Requires the previously installed Windows Python 3.13 and local wheelhouse.
#>
[CmdletBinding()]
param(
  [ValidateSet('Check','Install')]
  [string]$Mode='Check',
  [switch]$OwnerApproved
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if($env:OS -ne 'Windows_NT'){throw 'JREI_WINDOWS_ONLY'}
$root=Join-Path $env:LOCALAPPDATA 'JREI-Python'
$repo=Join-Path $root 'repo'
$wheelhouse=Join-Path $root 'wheelhouse'
$project=Join-Path $repo 'platform\jrei-python'
$stagingRoot=Join-Path $root 'source-staged'
$python=Join-Path $root 'venv\Scripts\python.exe'
$branch='migration/bertina-linux6'
$origin='https://github.com/drrezazadeh65/drjavadrezazadeh.com'
$receiptName='jrei-source-stage-receipt.v1.json'
function Emit([string]$message) {
  if($message -notmatch '^[A-Z0-9_]{4,90}$'){throw 'JREI_STAGE_EVENT_INVALID'}
  Write-Output ('[JREI] '+$message)
}
function Git([string[]]$arguments){
  $out=& $script:gitExe -C $repo @arguments 2>$null
  if($LASTEXITCODE -ne 0){throw 'JREI_STAGE_GIT_VALIDATION_FAILED'}
  return (($out|Out-String).Trim())
}
function EnsureCanonical{
  if(-not (Test-Path -LiteralPath $project -PathType Container)){
    throw 'JREI_STAGE_PROJECT_MISSING'
  }
  $script:gitExe=(Get-Command git.exe -ErrorAction Stop).Source
  if(-not [IO.Path]::IsPathRooted($script:gitExe)){
    throw 'JREI_STAGE_GIT_NOT_ABSOLUTE'
  }
  $remote=Git -arguments @('remote','get-url','origin')
  if($remote -cne $origin -and $remote -cne ($origin+'.git')){
    throw 'JREI_STAGE_WRONG_REMOTE'
  }
  if((Git -arguments @('branch','--show-current')) -cne $branch){
    throw 'JREI_STAGE_WRONG_BRANCH'
  }
  $tree=Git -arguments @('rev-parse','HEAD:platform/jrei-python')
  if($tree -cnotmatch '^[0-9a-f]{40}$'){throw 'JREI_STAGE_TREE_INVALID'}
  if([string]::IsNullOrWhiteSpace((Git -arguments @('rev-parse','HEAD')))){
    throw 'JREI_STAGE_HEAD_MISSING'
  }
  & $script:gitExe -C $repo diff --quiet --exit-code 1>$null 2>$null
  if($LASTEXITCODE -ne 0){throw 'JREI_STAGE_LOCAL_MODIFICATIONS_PRESERVED'}
  & $script:gitExe -C $repo diff --cached --quiet --exit-code 1>$null 2>$null
  if($LASTEXITCODE -ne 0){throw 'JREI_STAGE_STAGED_CHANGES_PRESERVED'}
  return $tree
}
function OfflineCommand([string]$exe,[string[]]$arguments,[string]$label){
  $previous=$ErrorActionPreference
  $ErrorActionPreference='Continue'
  try{
    & $exe @arguments 1>$stdout 2>$stderr
    $exit=$LASTEXITCODE
  }finally{
    $ErrorActionPreference=$previous
  }
  if($exit -ne 0){throw ('JREI_STAGE_'+$label+'_FAILED')}
}
$tree=EnsureCanonical
$version=$tree.Substring(0,16)
$target=Join-Path $stagingRoot ('src-'+$version)
$receipt=Join-Path $target $receiptName
if($Mode -eq 'Check'){
  Emit $(if(Test-Path -LiteralPath $receipt -PathType Leaf){
    'PYTHON_COMPONENTS_STAGE_RECEIPT_PRESENT'
  }else{'PYTHON_COMPONENTS_NOT_YET_STAGED'})
  Emit 'ACTIVE_PYTHON_AND_QWEN_UNCHANGED'
  return
}
if(-not $OwnerApproved){throw 'JREI_STAGE_OWNER_APPROVAL_REQUIRED'}
if(-not (Test-Path -LiteralPath $python -PathType Leaf)){
  throw 'JREI_STAGE_BASE_PYTHON_MISSING'
}
if(-not (Test-Path -LiteralPath $wheelhouse -PathType Container) -or
   @(Get-ChildItem -LiteralPath $wheelhouse -Filter '*.whl' -File).Count -eq 0){
  throw 'JREI_STAGE_OFFLINE_WHEELS_MISSING'
}
if(Test-Path -LiteralPath $receipt -PathType Leaf){
  $last=Get-Content -LiteralPath $receipt -Raw -Encoding UTF8|ConvertFrom-Json
  if($last.sourceTree -ceq $tree -and $last.staged -eq $true){
    Emit 'PYTHON_COMPONENTS_ALREADY_STAGED'
    return
  }
}
if(Test-Path -LiteralPath $target){
  # Refuse to overwrite any incomplete source stage or user files.
  $target=Join-Path $stagingRoot ('src-'+$version+'-'+[guid]::NewGuid().ToString('N').Substring(0,8))
  $receipt=Join-Path $target $receiptName
}
New-Item -ItemType Directory -Path $target -Force|Out-Null
$stdout=Join-Path $target 'stage-stdout.txt'
$stderr=Join-Path $target 'stage-stderr.txt'
$base=(& $python -c "import sys; print(str(sys.version_info.major)+'.'+str(sys.version_info.minor)+'.'+str(sys.maxsize>2**32))")
if($LASTEXITCODE -ne 0 -or $base.Trim() -cne '3.13.True'){
  throw 'JREI_STAGE_PYTHON_313_X64_REQUIRED'
}
Emit 'PYTHON_COMPONENTS_ISOLATED_STAGE_STARTED'
OfflineCommand $python @('-m','venv',$target) 'VENV'
$newPython=Join-Path $target 'Scripts\python.exe'
$built=Join-Path $target 'wheel-build'
New-Item -ItemType Directory -Force -Path $built|Out-Null
OfflineCommand $newPython @('-m','pip','wheel','--no-index','--disable-pip-version-check',
 '--find-links',$wheelhouse,'--wheel-dir',$built,'--no-deps',$project) 'WHEEL_BUILD'
$package=@(Get-ChildItem -LiteralPath $built -Filter 'jrei_intelligence_core-*.whl' -File)
if($package.Count -ne 1){throw 'JREI_STAGE_PROJECT_WHEEL_MISSING'}
OfflineCommand $newPython @('-m','pip','install','--no-index','--disable-pip-version-check',
 '--find-links',$wheelhouse,$package[0].FullName) 'OFFLINE_INSTALL'
$after=EnsureCanonical
if($after -cne $tree){throw 'JREI_STAGE_REPO_CHANGED_DURING_INSTALL'}
# An additive receipt records what was installed, never implies quality/rights,
# importability, LIVE activation, model training or a backed-up mother DB.
$manifest=@{
  schema='jr.jrei.python-components-source-stage.v1'
  sourceTree=$tree
  createdAtUtc=[DateTime]::UtcNow.ToString('o')
  installedWheelSha256=(Get-FileHash -LiteralPath $package[0].FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  staged=$true
  testsRun=$false
  activationPerformed=$false
  qwenChanged=$false
  motherDbModified=$false
  nextGate='INDEPENDENT_QA_AND_APPROVED_SOURCE_TREE_BEFORE_ACTIVE_PYTHON_PROMOTION'
}
$temp=$receipt+'.tmp'
[IO.File]::WriteAllText($temp,
  ($manifest|ConvertTo-Json -Depth 6),
  [Text.UTF8Encoding]::new($false))
Move-Item -LiteralPath $temp -Destination $receipt
Emit 'PYTHON_COMPONENTS_SOURCE_STAGED_NOT_ACTIVATED'
Emit 'NO_TESTS_NO_MODEL_RESTART_NO_PRODUCTION_DEPLOY'
