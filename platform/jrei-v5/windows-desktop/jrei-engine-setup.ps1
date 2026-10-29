#Requires -Version 5.1
<#
Original JREI owner-local 8092 engine setup, v0.1.10.
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
$version='0.1.10'
$taskName='JREI-Owner-Windows-Command-Center'
$private=Join-Path $env:LOCALAPPDATA 'JREI\command-center'
$receipts=Join-Path $private 'install-receipts'
$engine=Join-Path $PSScriptRoot ('engine-v'+$version+'\JREI-Engine.exe')
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
    -not (SafeFile $source 1000000) -or
    -not (SafeFile $manifest 10000)){
  throw 'JREI_OFFLINE_RUNTIME_MISSING'
 }
 $info=Get-Content -LiteralPath $manifest -Raw -Encoding UTF8|ConvertFrom-Json
 if($info.schema -cne 'jr.jrei.offline-engine-package.v1' -or
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
function OwnerReady {
 $tokenFile=Join-Path $private 'owner-token'
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
   $reader=New-Object IO.StreamReader($response.GetResponseStream())
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
function Record([string]$state,[string]$taskMode) {
 # Never persist owner tokens, process command lines, signed node identity,
 # personal documents or the contents of the private database in receipts.
 New-Item -ItemType Directory -Path $receipts -Force -ErrorAction Stop|Out-Null
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
 $destination=Join-Path $receipts 'latest-native-setup-receipt.json'
 $scratch=Join-Path $receipts ('.install-'+[guid]::NewGuid().ToString('N')+'.tmp')
 try{
  [IO.File]::WriteAllText($scratch,($document|ConvertTo-Json -Compress),
    (New-Object Text.UTF8Encoding($false)))
  Move-Item -LiteralPath $scratch -Destination $destination -Force -ErrorAction Stop
 }finally{
  if(Test-Path -LiteralPath $scratch){Remove-Item -LiteralPath $scratch -Force}
 }
}
function WaitOwner {
 for($n=0;$n -lt 10;$n++){
  if(OwnerReady){return $true}
  Start-Sleep -Seconds 2
 }
 return $false
}
function LaunchBundled {
 if(PortBusy){return $false}
 $wd=Split-Path -Path $engine -Parent
 $p=Start-Process -FilePath $engine -ArgumentList '--serve' -WorkingDirectory $wd -WindowStyle Hidden -PassThru -ErrorAction Stop
 if($null -eq $p){return $false}
 return (WaitOwner)
}
function HasExistingTask {
 try{
  $task=Get-ScheduledTask -TaskName $taskName -ErrorAction Stop
  return ($null -ne $task)
 }catch{return $false}
}
try{
 if($env:OS -cne 'Windows_NT' -or
    -not [Environment]::Is64BitOperatingSystem){
  throw 'JREI_WINDOWS_X64_REQUIRED'
 }
 VerifyPackage
 if($Mode -eq 'Install' -and -not $OwnerApproved){
  throw 'JREI_OWNER_INSTALL_APPROVAL_REQUIRED'
 }
 if(OwnerReady){
  if($Mode -eq 'Install'){Record 'ENGINE_AUTHENTICATED_EXISTING' 'TASK_UNCHANGED'}
  Emit 'JREI_ENGINE_AUTHENTICATED_EXISTING'
  return
 }
 if(PortBusy){
  if($Mode -eq 'Install'){
   Record 'ENGINE_PENDING_UNVERIFIED_8092_LISTENER' 'TASK_UNCHANGED'
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
 # On fresh owners' computers, preserve any existing Task Scheduler item,
 # including unknown actions. Do not auto-run obsolete task actions.
 # The GUI can relaunch the bundled core when the owner signs in.
 $auto='ON_DEMAND_NO_TASK_CHANGES'
 if($Mode -eq 'Install' -and (HasExistingTask)){
  $auto='EXISTING_TASK_PRESERVED'
 }
 $running=$false
 try{$running=LaunchBundled}catch{}
 if($running){
  if($Mode -eq 'Install'){Record 'ENGINE_AUTHENTICATED_BUNDLED' $auto}
  Emit 'JREI_ENGINE_AUTHENTICATED_BUNDLED'
  return
 }
 if($Mode -eq 'Install'){
  Record 'ENGINE_PENDING_START_NOT_VERIFIED' $auto
  Emit 'JREI_ENGINE_PENDING_START_NOT_VERIFIED'
  return
 }
 throw 'JREI_ENGINE_START_NOT_VERIFIED'
}catch{
 $code=[string]$_.Exception.Message
 if($code -cnotmatch '^JREI_[A-Z0-9_]{4,110}$'){
  $code='JREI_ENGINE_SETUP_FAILED'
 }
 if($Mode -eq 'Install'){
  try{Record $code 'FAILED_NO_TASK_OR_DATA_CHANGES'}catch{}
 }
 Write-Error $code
 exit 1
}
