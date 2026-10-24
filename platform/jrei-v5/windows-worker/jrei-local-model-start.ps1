<#
  JREI-LM Windows 11 local CPU server. Runs only on explicit owner approval.
  This script does not download/install any model, fetch external APIs, open
  the LAN firewall, or accept parameters supplied by the website.
  Requires: private config.localChat with modelFile and sha256, and a
  separately audited, locally installed llama.cpp llama-server.exe whose
  SHA-256 is pinned in localChat.backendExeSha256. CPU-only safe baseline.
  Run once on each owner computer BEFORE "jrei-worker.mjs start-chat".
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$ConfigPath,
  [switch]$OwnerApproved
)
$ErrorActionPreference='Stop'
if(-not $OwnerApproved){throw 'JREI_LOCAL_MODEL_EXPLICIT_OWNER_APPROVAL_REQUIRED'}
if(-not [Environment]::OSVersion.Platform.ToString().StartsWith('Win')){
  throw 'LOCAL_MODEL_WINDOWS_ONLY'
}
if(-not [IO.Path]::IsPathRooted($ConfigPath) -or
   -not [IO.File]::Exists($ConfigPath)){
  throw 'LOCAL_MODEL_PRIVATE_CONFIG_NOT_FOUND'
}
$cfg=Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$c=$cfg.localChat
if($null -eq $c -or $c.enabled -ne $true -or
   $c.ownerApproved -ne $true -or $c.rightsReviewed -ne $true){
  throw 'LOCAL_MODEL_PRIVATE_APPROVAL_REQUIRED'
}
# A named per-user mutex prevents a Task Scheduler/manual restart from
# allocating a second multi-GB GGUF server on the same Windows machine.
# The other computer has an independent operating-system mutex namespace.
$singleInstance=[System.Threading.Mutex]::new($false, 'Local\JREI-Owner-Local-Model')
$mutexHeld=$false
try {
  $mutexHeld=$singleInstance.WaitOne(0)
  if(-not $mutexHeld){throw 'LOCAL_MODEL_ALREADY_RUNNING_ON_THIS_COMPUTER'}
  $exe=[string]$c.backendExe
$model=[string]$c.modelFile
$expectedExe=[string]$c.backendExeSha256
$expectedModel=[string]$c.modelSha256
if(-not [IO.Path]::IsPathRooted($exe) -or
   -not [IO.Path]::IsPathRooted($model) -or
   -not [IO.File]::Exists($exe) -or
   -not [IO.File]::Exists($model) -or
   $exe.Length -gt 500 -or $model.Length -gt 500 -or
   [IO.Path]::GetExtension($exe).ToLowerInvariant() -ne '.exe' -or
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
$uri=[uri]([string]$c.endpoint)
if($uri.Scheme -ne 'http' -or $uri.Host -ne '127.0.0.1' -or
   $uri.AbsolutePath -ne '/v1/chat/completions' -or
   $uri.Query -ne '' -or $uri.Fragment -ne '' -or
   $uri.Port -lt 1024 -or $uri.Port -gt 65535){
  throw 'LOCAL_MODEL_LOOPBACK_ONLY'
}
# Runtime/driver probing must precede GPU use; CPU mode only on both
# Ryzen desktops until an owner-reviewed AMD Vulkan/backend benchmark.
# The prior fixed six CPU threads could monopolise small Windows desktops
# when the independent evaluation worker is active. Never use more than half
# the logical processors or four inference threads by default.
$logicalCores=[Environment]::ProcessorCount
$threads=[Math]::Max(1,[Math]::Min(4,[Math]::Floor($logicalCores/2)))
if($null -ne $c.cpuThreads){
  $requestedThreads=0
  if(-not [int]::TryParse([string]$c.cpuThreads,[ref]$requestedThreads) -or
     $requestedThreads -lt 1 -or $requestedThreads -gt $threads){
    throw 'LOCAL_MODEL_CPU_THREAD_BUDGET_INVALID'
  }
  $threads=$requestedThreads
}
$context=2048
# Quoting paths as individual fixed arguments prevents arbitrary CLI flags.
$arguments=@(
  '--model', ('"'+$model.Replace('"','')+'"'),
  '--host','127.0.0.1',
  '--port', [string]$uri.Port,
  '--ctx-size',[string]$context,
  '--threads',[string]$threads,
  '--n-gpu-layers','0'
)
Write-Output 'JREI-LM verified local model and binary SHA-256; starting CPU-only loopback.'
$process=Start-Process -FilePath $exe -ArgumentList $arguments -PassThru -NoNewWindow
if($null -eq $process){throw 'LOCAL_MODEL_START_FAILED'}
try{
  # Deprioritise local inference relative to interactive desktop work.
  # Failure to change priority does not bypass the pinned model checks.
  try { $process.PriorityClass='BelowNormal' } catch {}
  $process.WaitForExit()
  if($process.ExitCode -ne 0){throw 'LOCAL_MODEL_RUNTIME_FAILED'}
}finally{
  if(-not $process.HasExited){Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue}
}
} finally {
  if($mutexHeld){$singleInstance.ReleaseMutex()}
  $singleInstance.Dispose()
}
