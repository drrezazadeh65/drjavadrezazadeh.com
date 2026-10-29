#Requires -Version 5.1
<#
Original JREI owner-local 8092 engine setup, bundled CPython.
The EXE ships the original private command center and its libraries.
Installation of PROGRAM FILES is independent of the health of a process
already occupying 8092. Never kill a process, hijack a listener, disable
security, rewrite node identity or delete user data and previous tasks.
#>
[CmdletBinding()]
param(
 [ValidateSet('Status','Start','Install')][string]$Mode='Status',
 [switch]$OwnerApproved
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$version='0.1.14'
$taskName='JREI-Owner-Windows-Command-Center'
$private=Join-Path $env:LOCALAPPDATA 'JREI\command-center'
$receipts=Join-Path $private 'install-receipts'
$engine=Join-Path $PSScriptRoot ('python-v'+$version+'\python.exe')
$launcher=Join-Path $PSScriptRoot ('source-v'+$version+'\platform\jrei-v5\windows-desktop\jrei_embedded_engine.py')
$runtimePth=Join-Path $PSScriptRoot ('python-v'+$version+'\python313._pth')
$runtimeSite=Join-Path $PSScriptRoot ('python-v'+$version+'\Lib\site-packages\fastapi\__init__.py')
$source=Join-Path $PSScriptRoot ('source-v'+$version+'\platform\jrei-python\jrei_service\windows_command_center.py')
$manifest=Join-Path $PSScriptRoot 'jrei-engine-manifest.json'

function Emit([string]$name) {
 if($name -cnotmatch '^JREI_[A-Z0-9_]{4,96}$'){
  throw 'JREI_SETUP_EVENT_INVALID'
 }
 Write-Output ('[JREI] '+$name)
}
function SafeFile([string]$path,[long]$limit) {
 if(-not (Test-Path -LiteralPath $path -PathType Leaf)){return $false}
 $stat=Get-Item -LiteralPath $path -ErrorAction Stop
 return ($stat.Length -gt 0 -and $stat.Length -le $limit -and
    -not ($stat.Attributes -band [IO.FileAttributes]::ReparsePoint))
}
function VerifyPackage {
 if(-not (SafeFile $engine 450MB) -or
    -not (SafeFile $launcher 200000) -or
    -not (SafeFile $runtimePth 2000) -or
    -not (SafeFile $runtimeSite 200000) -or
    -not (SafeFile $source 1000000) -or
    -not (SafeFile $manifest 10000)){
  throw 'JREI_OFFLINE_RUNTIME_MISSING'
 }
 $info=Get-Content -LiteralPath $manifest -Raw -Encoding UTF8|ConvertFrom-Json
 if($info.schema -cne 'jr.jrei.offline-engine-package.v1' -or
    $info.engine_runtime -cne 'BUNDLED_CPYTHON_3_13' -or
    $info.source_branch -cne 'migration/bertina-linux6' -or
    [string]$info.source_commit -cnotmatch '^[0-9a-f]{40}$' -or
    [string]$info.engine_sha256 -cnotmatch '^[0-9a-f]{64}$'){
  throw 'JREI_OFFLINE_PACKAGE_METADATA_INVALID'
 }
 $hash=(Get-FileHash -LiteralPath $engine -Algorithm SHA256).Hash.ToLowerInvariant()
 if($hash -cne [string]$info.engine_sha256){
  throw 'JREI_OFFLINE_ENGINE_HASH_MISMATCH'
 }
}
function OwnerTokenFile {
 # Same explicit private-store marker as Python/Tk; no arbitrary paths from
 # environment variables, network services or imported configuration.
 $fallbacks=@(
  (Join-Path $env:LOCALAPPDATA 'JREI-Owner\command-center'),
  (Join-Path $env:USERPROFILE 'JREI-Owner\command-center')
 )
 $active=@()
 foreach($folder in $fallbacks){
  $marker=Join-Path $folder '.jrei-active-private-store-v1.json'
  if(-not (SafeFile $marker 2048)){continue}
  try{
   $info=Get-Content -LiteralPath $marker -Encoding UTF8 -Raw |
     ConvertFrom-Json -ErrorAction Stop
   if($info.schema -ceq 'jr.jrei.owner-private-storage-selection.v1' -and
      $info.selected -eq $true){
    $active+=,$folder
   }
  }catch{}
 }
 if($active.Count -gt 1){
  throw 'JREI_MULTIPLE_ACTIVE_PRIVATE_STORES'
 }
 if($active.Count -eq 1){
  return (Join-Path $active[0] 'owner-token')
 }
 return (Join-Path $private 'owner-token')
}
function OwnerReady {
 $tokenFile=OwnerTokenFile
 if(-not (SafeFile $tokenFile 256)){return $false}
 try{
  $token=(Get-Content -LiteralPath $tokenFile -Raw -Encoding Ascii).Trim()
  if($token -cnotmatch '^[A-Za-z0-9_-]{50,128}$'){return $false}
  # Direct .NET loopback request, no system HTTP proxy or redirection.
  # A random process listening on 8092 is NOT accepted as JREI.
  $request=[Net.HttpWebRequest][Net.WebRequest]::Create(
    'http://127.0.0.1:8092/api/status')
  $request.Proxy=$null
  $request.AllowAutoRedirect=$false
  $request.Timeout=3000
  $request.ReadWriteTimeout=3000
  $request.Headers[[Net.HttpRequestHeader]::Authorization]='Bearer '+$token
  $response=$request.GetResponse()
  try{
   if([int]$response.StatusCode -ne 200){return $false}
   $reader=[IO.StreamReader]::new($response.GetResponseStream())
   try{
    $payload=$reader.ReadToEnd()
    if($payload.Length -gt 130000){return $false}
    $status=$payload|ConvertFrom-Json
    return ($status.schema -ceq 'jr.jrei.windows-command-center.v2' -and
      $status.owner_private -eq $true)
   }finally{$reader.Dispose()}
  }finally{$response.Dispose()}
 }catch{return $false}
}
function PortBusy {
 $client=New-Object Net.Sockets.TcpClient
 try{
  $connection=$client.BeginConnect('127.0.0.1',8092,$null,$null)
  return ($connection.AsyncWaitHandle.WaitOne(750) -and $client.Connected)
 }catch{return $false}
 finally{$client.Dispose()}
}
function TryRecord([string]$state,[string]$taskMode) {
 # A receipt is useful evidence, NOT a prerequisite for engine startup.
 # The original private folder may be access-denied on this very PC.
 # Failure to record is explicitly tracked, not converted to a fake
 # successful engine state or a blanket JREI_ENGINE_SETUP_FAILED.
 $script:ReceiptWritten=$false
 $document=[ordered]@{
  schema='jr.jrei.offline-owner-install.v2'
  installed_version=$version
  recorded_utc=(Get-Date).ToUniversalTime().ToString('o')
  state=$state
  task_mode=$taskMode
  private_data_replaced=$false
  node_identity_reassigned=$false
  existing_windows_task_overwritten=$false
  server_enrollment_verified=$false
  model_weight_readiness_verified=$false
 }
 try {
  New-Item -ItemType Directory -Path $receipts -Force -ErrorAction Stop|Out-Null
  $destination=Join-Path $receipts 'latest-native-setup-receipt.json'
  $scratch=Join-Path $receipts ('.install-'+[guid]::NewGuid().ToString('N')+'.tmp')
  try {
   [IO.File]::WriteAllText($scratch,($document|ConvertTo-Json -Compress),
     ([Text.UTF8Encoding]::new($false)))
   Move-Item -LiteralPath $scratch -Destination $destination -Force -ErrorAction Stop
   $script:ReceiptWritten=$true
  } finally {
   if(Test-Path -LiteralPath $scratch -PathType Leaf){
    Remove-Item -LiteralPath $scratch -Force -ErrorAction SilentlyContinue
   }
  }
 } catch {
  $script:ReceiptWritten=$false
 }
}
function WaitOwner {
 for($n=0;$n -lt 10;$n++){
  if(OwnerReady){return $true}
  Start-Sleep -Seconds 2
 }
 return $false
}
$script:LastPrivateEngineError='JREI_ENGINE_START_NOT_VERIFIED'
function LaunchBundled {
 if(PortBusy){return $false}
 $wd=Split-Path -Path $engine -Parent
 # The original private directory may be unwritable specifically to the
 # frozen Python executable. Diagnostics use the owner-writable VERSIONED
 # program directory and are deleted after parsing a fixed error code.
 $stderr=Join-Path $PSScriptRoot ('.jrei-engine-'+[guid]::NewGuid().ToString('N')+'.stderr')
 try {
  # Launch PSF CPython, rather than the PyInstaller executable blocked
  # by this owner's Windows security configuration during SQLite writes.
  $cmdArgs=@('-I','-B',('"'+$launcher+'"'),'--serve')
  $proc=Start-Process -FilePath $engine -ArgumentList $cmdArgs -WorkingDirectory $wd -WindowStyle Hidden -PassThru -RedirectStandardError $stderr -ErrorAction Stop
  if($null -eq $proc){return $false}
  for($n=0;$n -lt 30;$n++){
   if(OwnerReady){return $true}
   if($proc.HasExited){break}
   Start-Sleep -Seconds 2
  }
  if(Test-Path -LiteralPath $stderr -PathType Leaf){
   $lines=Get-Content -LiteralPath $stderr -Encoding UTF8 -ErrorAction SilentlyContinue
   foreach($line in $lines){
    $clean=[string]$line
    if($clean.StartsWith('[JREI] ')){
     $code=$clean.Substring(7).Trim()
     if($code -cmatch '^JREI_[A-Z0-9_]{4,110}$'){
      $script:LastPrivateEngineError=$code
      break
     }
    }
   }
  }
  return $false
 } finally {
  if(Test-Path -LiteralPath $stderr -PathType Leaf){
   Remove-Item -LiteralPath $stderr -Force -ErrorAction SilentlyContinue
  }
 }
}
function HasExistingTask {
 try{
  $task=Get-ScheduledTask -TaskName $taskName -ErrorAction Stop
  return ($null -ne $task)
 }catch{return $false}
}
$script:Stage='START'
try{
 $script:Stage='ENVIRONMENT'
 if($env:OS -cne 'Windows_NT' -or
    -not [Environment]::Is64BitOperatingSystem){
  throw 'JREI_WINDOWS_X64_REQUIRED'
 }
 $script:Stage='PACKAGE'
 VerifyPackage
 $script:Stage='APPROVAL'
 if($Mode -eq 'Install' -and -not $OwnerApproved){
  throw 'JREI_OWNER_INSTALL_APPROVAL_REQUIRED'
 }
 $script:Stage='LOOPBACK'
 if(OwnerReady){
  if($Mode -eq 'Install'){TryRecord 'ENGINE_AUTHENTICATED_EXISTING' 'TASK_UNCHANGED'}
  Emit 'JREI_ENGINE_AUTHENTICATED_EXISTING'
  return
 }
 if(PortBusy){
  if($Mode -eq 'Install'){
   TryRecord 'ENGINE_PENDING_UNVERIFIED_8092_LISTENER' 'TASK_UNCHANGED'
   Emit 'JREI_ENGINE_PENDING_UNVERIFIED_8092_LISTENER'
   return
  }
  if($Mode -eq 'Status'){
   Emit 'JREI_ENGINE_PENDING_UNVERIFIED_8092_LISTENER'
   return
  }
  throw 'JREI_8092_LISTENER_UNVERIFIED_PRESERVED'
 }
 if($Mode -eq 'Status'){
  Emit 'JREI_ENGINE_NOT_RUNNING'
  return
 }
 $script:Stage='OLD_TASK_READ'
 $auto='ON_DEMAND_NO_TASK_CHANGES'
 if($Mode -eq 'Install' -and (HasExistingTask)){
  $auto='EXISTING_TASK_PRESERVED'
 }
 $script:Stage='ENGINE_PROCESS'
 $running=$false
 try{$running=LaunchBundled}catch{
  $script:LastPrivateEngineError='JREI_ENGINE_PROCESS_LAUNCH_DENIED'
 }
 if($running){
  if($Mode -eq 'Install'){TryRecord 'ENGINE_AUTHENTICATED_BUNDLED' $auto}
  Emit 'JREI_ENGINE_AUTHENTICATED_BUNDLED'
  return
 }
 if($Mode -eq 'Install'){
  TryRecord $script:LastPrivateEngineError $auto
  Emit $script:LastPrivateEngineError
  return
 }
 throw $script:LastPrivateEngineError
}catch{
 $code=[string]$_.Exception.Message
 if($code -cnotmatch '^JREI_[A-Z0-9_]{4,110}$'){
  $code='JREI_SETUP_'+$script:Stage+'_FAILED'
 }
 if($Mode -eq 'Install'){
  TryRecord $code 'FAILED_NO_TASK_OR_DATA_CHANGES'
 }
 # Only bounded diagnostic identifier is visible outside the owner PC.
 # No stack trace, signed worker keys, bearer tokens, or profile paths.
 [Console]::Error.WriteLine($code)
 exit 1
}
