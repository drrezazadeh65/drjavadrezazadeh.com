#Requires -Version 5.1
<#
  JREI-LM Windows local GGUF runner. No Python, downloads, network setup,
  model installation, API keys, public listening ports, or database writes.
  The owner may verify a staged model locally without enabling public chat:
     .\jrei-local-model-start.ps1 -ConfigPath <PRIVATE_JSON> -OwnerApproved -StagingOnly
  For reviewed live operation, omit -StagingOnly and satisfy the existing
  owner-approval, rights, runtime and independent quality gates.
  Stops with Ctrl+C; no automatic restart or task registration is performed.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$ConfigPath,
  [switch]$OwnerApproved,
  [switch]$StagingOnly
)
$ErrorActionPreference='Stop'
if(-not $OwnerApproved){throw 'JREI_LOCAL_MODEL_EXPLICIT_OWNER_APPROVAL_REQUIRED'}
if($env:OS -ne 'Windows_NT'){throw 'LOCAL_MODEL_WINDOWS_ONLY'}
if(-not [IO.Path]::IsPathRooted($ConfigPath) -or
   -not [IO.File]::Exists($ConfigPath)){
  throw 'LOCAL_MODEL_PRIVATE_CONFIG_NOT_FOUND'
}
try {
  $cfg=Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
} catch { throw 'LOCAL_MODEL_PRIVATE_CONFIG_UNREADABLE' }
$c=$cfg.localChat
if($null -eq $c -or $c.ownerApproved -ne $true){
  throw 'LOCAL_MODEL_PRIVATE_APPROVAL_REQUIRED'
}
if($StagingOnly){
  # A staging-only local test must never activate an approved public route.
  if($c.enabled -ne $false){
    throw 'LOCAL_MODEL_STAGING_REQUIRES_PUBLIC_CHAT_OFF'
  }
} else {
  if($c.enabled -ne $true -or $c.rightsReviewed -ne $true -or
     $c.modelRuntimeVerified -ne $true -or
     $c.independentQualityAccepted -ne $true){
    throw 'LOCAL_MODEL_PRIVATE_APPROVAL_REQUIRED'
  }
}
$exe=[string]$c.backendExe
$model=[string]$c.modelFile
$expectedExe=[string]$c.backendExeSha256
$expectedModel=[string]$c.modelSha256
$modelAlias=[string]$c.modelId
if($modelAlias -cnotmatch '^[A-Za-z0-9._:-]{1,100}$'){
  throw 'LOCAL_MODEL_ALIAS_INVALID'
}
if(-not [IO.Path]::IsPathRooted($exe) -or
   -not [IO.Path]::IsPathRooted($model) -or
   -not [IO.File]::Exists($exe) -or
   -not [IO.File]::Exists($model) -or
   $exe.Length -gt 500 -or $model.Length -gt 500 -or
   [IO.Path]::GetFileName($exe).ToLowerInvariant() -ne 'llama-server.exe' -or
   [IO.Path]::GetExtension($model).ToLowerInvariant() -ne '.gguf'){
  throw 'LOCAL_MODEL_BINARY_OR_GGUF_NOT_APPROVED'
}
if($expectedExe -cnotmatch '^[a-f0-9]{64}$' -or
   $expectedModel -cnotmatch '^[a-f0-9]{64}$'){
  throw 'LOCAL_MODEL_SHA256_REQUIRED'
}
if((Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLowerInvariant() -cne $expectedExe){
  throw 'LOCAL_MODEL_SERVER_BINARY_SHA256_MISMATCH'
}
if((Get-FileHash -LiteralPath $model -Algorithm SHA256).Hash.ToLowerInvariant() -cne $expectedModel){
  throw 'LOCAL_MODEL_GGUF_SHA256_MISMATCH'
}
try { $uri=[uri]([string]$c.endpoint) }
catch { throw 'LOCAL_MODEL_LOOPBACK_ONLY' }
if($uri.Scheme -ne 'http' -or $uri.Host -ne '127.0.0.1' -or
   $uri.AbsolutePath -ne '/v1/chat/completions' -or
   $uri.Query -ne '' -or $uri.Fragment -ne '' -or
   [string]$uri.UserInfo -ne '' -or
   $uri.Port -lt 1024 -or $uri.Port -gt 65535){
  throw 'LOCAL_MODEL_LOOPBACK_ONLY'
}
# No competing listener: fail rather than replacing any unrelated process.
$active=Get-NetTCPConnection -State Listen -LocalPort $uri.Port -ErrorAction SilentlyContinue
if($active){throw 'LOCAL_MODEL_PORT_ALREADY_IN_USE'}

$threads=[Math]::Max(1,[Math]::Min(4,[Math]::Floor([Environment]::ProcessorCount/2)))
if($null -ne $c.cpuThreads){
  $requestedThreads=0
  if(-not [int]::TryParse([string]$c.cpuThreads,[ref]$requestedThreads) -or
     $requestedThreads -lt 1 -or $requestedThreads -gt $threads){
    throw 'LOCAL_MODEL_CPU_THREAD_BUDGET_INVALID'
  }
  $threads=$requestedThreads
}
# The owner selected a CPU-first baseline. GPU acceleration remains unapproved.
$arguments=@(
  '--model', ('"'+$model.Replace('"','')+'"'),
  '--alias', $modelAlias,
  '--host', '127.0.0.1',
  '--port', [string]$uri.Port,
  '--ctx-size', '2048',
  '--threads', [string]$threads,
  '--n-gpu-layers', '0'
)

# One dedicated Windows owner launcher per machine; never overwrite node keys.
$singleInstance=[System.Threading.Mutex]::new($false,'Global\JREI-Owner-Local-Model')
$mutexHeld=$false
try {
  try { $mutexHeld=$singleInstance.WaitOne(0) }
  catch [System.Threading.AbandonedMutexException] { $mutexHeld=$true }
  if(-not $mutexHeld){throw 'LOCAL_MODEL_ALREADY_RUNNING_ON_THIS_COMPUTER'}
  Write-Output '[JREI] VERIFIED_GGUF_AND_LLAMA_BINARY'
  Write-Output '[JREI] STARTING_LOCAL_LOOPBACK_WITH_JREI_ALIAS'
  if($StagingOnly){
    Write-Output '[JREI] STAGING_ONLY_PUBLIC_CHAT_OFF'
  } else {
    Write-Output '[JREI] REVIEWED_LOCAL_MODEL_START'
  }
  $process=Start-Process -FilePath $exe -ArgumentList $arguments -PassThru -NoNewWindow
  if($null -eq $process){throw 'LOCAL_MODEL_START_FAILED'}
  try {
    try {$process.PriorityClass='BelowNormal'}catch {}
    $process.WaitForExit()
    if($process.ExitCode -ne 0){throw 'LOCAL_MODEL_RUNTIME_FAILED'}
  } finally {
    if(-not $process.HasExited){
      Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }
  }
} finally {
  if($mutexHeld){$singleInstance.ReleaseMutex()}
  $singleInstance.Dispose()
}
