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
$version='0.1.19'
$taskName='JREI-Owner-Windows-Command-Center'
$private=Join-Path $env:LOCALAPPDATA 'JREI\command-center'
$receipts=Join-Path $private 'install-receipts'
$engine=Join-Path $PSScriptRoot ('python-v'+$version+'\python.exe')
$launcher=Join-Path $PSScriptRoot ('source-v'+$version+'\platform\jrei-v5\windows-desktop\jrei_embedded_engine.py')
$systemBootstrap=Join-Path $PSScriptRoot ('source-v'+$version+'\platform\jrei-v5\windows-desktop\jrei_owner_python_bootstrap.py')
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
    -not (SafeFile $systemBootstrap 200000) -or
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
 $script:ExpectedCommit=[string]$info.source_commit
}
function OwnerTokenFile {
 # Same explicit private-store marker as Python/Tk; no arbitrary paths from
 # environment variables, network services or imported configuration.
 $fallbacks=@(
  (Join-Path $env:LOCALAPPDATA 'JREI-Owner\command-center'),
  (Join-Path $env:USERPROFILE 'JREI-Owner\command-center'),
  (Join-Path $env:LOCALAPPDATA 'JREI-Private-v2\command-center'),
  (Join-Path $env:USERPROFILE '.jrei-owner\command-center')
 )
 if($env:APPDATA -and -not $env:APPDATA.StartsWith('\\')){
  try{
   $roaming=Get-Item -LiteralPath $env:APPDATA -ErrorAction Stop
   if($roaming.PSIsContainer -and -not (
      $roaming.Attributes -band [IO.FileAttributes]::ReparsePoint)){
    $fallbacks+=,(Join-Path $env:APPDATA 'JREI-Owner\command-center')
   }
  }catch{}
 }
 # Stable, per-user credentials sibling to releases, NOT in versioned files.
 try{
  $app=Get-Item -LiteralPath $PSScriptRoot -ErrorAction Stop
  $releases=$app.Parent
  $container=$releases.Parent
  $profileRoot=[IO.Path]::GetFullPath($env:USERPROFILE).TrimEnd('\')
  $containerRoot=[IO.Path]::GetFullPath($container.FullName)
  if($app.Name -cmatch '^v[0-9]+\.[0-9]+\.[0-9]+$' -and
     $releases.Name -ceq 'releases' -and
     (SafeFile (Join-Path $PSScriptRoot 'jrei-engine-manifest.json') 10000) -and
     $containerRoot.StartsWith(($profileRoot+'\'),[StringComparison]::OrdinalIgnoreCase)){
    $current=$container
    $trusted=$true
    while($current.FullName -ine $profileRoot){
     if($current.Attributes -band [IO.FileAttributes]::ReparsePoint){
      $trusted=$false
      break
     }
     if($null -eq $current.Parent){$trusted=$false;break}
     $current=$current.Parent
    }
    if($trusted){
     $fallbacks+=,(Join-Path $container.FullName 'JREI-Owner-Private\command-center')
    }
  }
 }catch{}
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
    if($status.schema -ceq 'jr.jrei.windows-command-center.v2' -and
       $status.owner_private -eq $true){
      $script:LastOwnerStatus=$status
      return $true
    }
    return $false
   }finally{$reader.Dispose()}
  }finally{$response.Dispose()}
 }catch{return $false}
}
function ReadyForThisRelease {
 # Previous authenticated JREI code is NOT the new packaged source.
 if(-not (OwnerReady)){return $false}
 return ($script:LastOwnerStatus.windows_app_source_commit -ceq
         $script:ExpectedCommit)
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
  if(ReadyForThisRelease){return $true}
  Start-Sleep -Seconds 2
 }
 return $false
}
$script:LastPrivateEngineError='JREI_ENGINE_START_NOT_VERIFIED'
function ConfirmPython313([string]$path) {
 if(-not $path -or -not (SafeFile $path 35000000)){return $null}
 try{
  # This matches the successful CPython 3.13 owner probes, not a random
  # python.exe on PATH. -I -S exclude PYTHONPATH and user/global site code.
  $output=@(& $path -I -S -B -c "import sys;print('JREI_PY313_X64' if sys.version_info[:2]==(3,13) and sys.maxsize>2**32 else 'UNSUPPORTED')" 2>$null)
  if($LASTEXITCODE -eq 0 -and $output.Count -eq 1 -and
     [string]$output[0] -ceq 'JREI_PY313_X64'){
   return $path
  }
 }catch{}
 return $null
}
function SystemPython313Launcher {
 # A device that has already demonstrated successful CPython SQLite writes
 # should NOT be forced through the package-local Python.exe. The py.exe
 # launcher can be absent from the desktop app's PATH, hence check typical
 # per-user/system installations and PEP-514 registry locations as well.
 $potential=New-Object 'System.Collections.Generic.List[string]'
 foreach($launch in @('py.exe','py')){
  $cmd=Get-Command $launch -CommandType Application -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if($null -eq $cmd){continue}
  $py=[string]$cmd.Source
  if(-not (SafeFile $py 35000000)){continue}
  try{
   $output=@(& $py -3.13 -I -S -B -c "import sys; print(sys.executable if sys.version_info[:2]==(3,13) and sys.maxsize>2**32 else '')" 2>$null)
   if($LASTEXITCODE -eq 0 -and $output.Count -eq 1){
    $potential.Add([string]$output[0])
   }
  }catch{}
 }
 foreach($path in @(
  (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python313\python.exe'),
  (Join-Path $env:ProgramFiles 'Python313\python.exe'),
  (Join-Path $env:SystemDrive 'Python313\python.exe')
  )){
  $potential.Add($path)
 }
 foreach($key in @(
  'HKCU:\Software\Python\PythonCore\3.13\InstallPath',
  'HKLM:\Software\Python\PythonCore\3.13\InstallPath',
  'HKLM:\Software\WOW6432Node\Python\PythonCore\3.13\InstallPath'
  )){
  try{
   $item=Get-Item -LiteralPath $key -ErrorAction Stop
   $path=[string]$item.GetValue('ExecutablePath','')
   if(-not $path){
    $dir=[string]$item.GetValue('','')
    if($dir){$path=Join-Path $dir 'python.exe'}
   }
   if($path){$potential.Add($path)}
  }catch{}
 }
 $visited=@{}
 foreach($path in $potential){
  if(-not $path -or $visited.ContainsKey($path)){continue}
  $visited[$path]=$true
  $resolved=ConfirmPython313 $path
  if($resolved){return $resolved}
 }
 return $null
}
function LaunchCandidate([string]$program,[string[]]$argumentList) {
 $stderr=Join-Path $PSScriptRoot ('.jrei-engine-'+[guid]::NewGuid().ToString('N')+'.stderr')
 try{
  $proc=Start-Process -FilePath $program -ArgumentList $argumentList -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru -RedirectStandardError $stderr -ErrorAction Stop
  if($null -eq $proc){return 'FAILED'}
  for($n=0;$n -lt 30;$n++){
   if(ReadyForThisRelease){return 'AUTHENTICATED'}
   if($proc.HasExited){break}
   Start-Sleep -Seconds 2
  }
  if(-not $proc.HasExited){return 'RUNNING_UNVERIFIED'}
  if(Test-Path -LiteralPath $stderr -PathType Leaf){
   foreach($line in (Get-Content -LiteralPath $stderr -Encoding UTF8 -ErrorAction SilentlyContinue)){
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
  return 'EXITED'
 }catch{
  $script:LastPrivateEngineError='JREI_ENGINE_PROCESS_LAUNCH_DENIED'
  return 'FAILED'
 }finally{
  if(Test-Path -LiteralPath $stderr -PathType Leaf){
   Remove-Item -LiteralPath $stderr -Force -ErrorAction SilentlyContinue
  }
 }
}
function LaunchBundled {
 if(PortBusy){return $false}
 $system=SystemPython313Launcher
 $ownerFailure=''
 if($system){
  # -S avoids importing any independently installed site packages.
  # All JREI dependencies come from the ONE offline setup's vendor tree.
  $arguments=@('-I','-S','-B',('"'+$systemBootstrap+'"'),'--serve')
  $result=LaunchCandidate $system $arguments
  if($result -ceq 'AUTHENTICATED'){return $true}
  # Never launch another engine while an earlier process is still alive.
  if($result -ceq 'RUNNING_UNVERIFIED' -or (PortBusy)){return $false}
  $ownerFailure=$script:LastPrivateEngineError
  if($ownerFailure -ceq 'JREI_ENGINE_START_NOT_VERIFIED'){
   $ownerFailure='JREI_OWNER_SYSTEM_PYTHON_EXITED_UNVERIFIED'
  }
 }
 $script:LastPrivateEngineError='JREI_ENGINE_START_NOT_VERIFIED'
 $arguments=@('-I','-B',('"'+$launcher+'"'),'--serve')
 $result=LaunchCandidate $engine $arguments
 if($result -ceq 'AUTHENTICATED'){return $true}
 # The known-working OS Python path provides more relevant evidence than
 # the package-local interpreter when both fail on the same Windows PC.
 # Preserve its specific code; do not hide it with an unrelated fallback.
 if($ownerFailure){$script:LastPrivateEngineError=$ownerFailure}
 return $false
}
function HasExistingTask {
 try{
  $task=Get-ScheduledTask -TaskName $taskName -ErrorAction Stop
  return ($null -ne $task)
 }catch{return $false}
}
function TryOwnerApprovedBundledHandover {
 # The current installer was explicitly opened by this owner. Only an
 # authenticated, idle, SAME USER Python launched from a previous JREI
 # immutable Go release may be stopped. No arbitrary Python/Windows tasks.
 if($Mode -cne 'Install' -or -not $OwnerApproved){return $false}
 $status=$script:LastOwnerStatus
 if($null -eq $status -or $status.busy -ne $false -or
    $status.owner_activity_recent -ne $false){return $false}
 $prior=$null
 $stopped=$false
 try{
  $task=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  if($null -ne $task -and $task.State -eq 'Running'){return $false}
  $ids=@(Get-NetTCPConnection -LocalPort 8092 -State Listen -ErrorAction Stop |
    Where-Object {$_.LocalAddress -eq '127.0.0.1'} |
    Select-Object -ExpandProperty OwningProcess -Unique)
  if($ids.Count -ne 1 -or [int]$ids[0] -le 4){return $false}
  $oldPid=[int]$ids[0]
  $proc=Get-CimInstance Win32_Process -Filter ("ProcessId="+$oldPid) -ErrorAction Stop
  if($null -eq $proc -or
     [IO.Path]::GetFileName([string]$proc.ExecutablePath) -ine 'python.exe'){
   return $false
  }
  $identity=Invoke-CimMethod -InputObject $proc -MethodName GetOwnerSid -ErrorAction Stop
  $currentSid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  if($identity.ReturnValue -ne 0 -or [string]$identity.Sid -cne $currentSid){
   return $false
  }
  $command=[string]$proc.CommandLine
  if(-not $command.Contains('--serve')){return $false}
  $roots=@(
    (Join-Path $env:LOCALAPPDATA 'Programs\JREI\releases'),
    (Join-Path $env:LOCALAPPDATA 'JREI-Applications\releases'),
    (Join-Path $env:USERPROFILE 'JREI-Applications\releases'),
    (Join-Path $env:USERPROFILE 'JREI-Installed\releases')
  )
  foreach($root in $roots){
   if(-not (Test-Path -LiteralPath $root -PathType Container)){continue}
   $versions=@(Get-ChildItem -LiteralPath $root -Directory -ErrorAction Stop |
     Where-Object {$_.Name -match '^v[0-9]+\.[0-9]+\.[0-9]+
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
 if(ReadyForThisRelease){
  if($Mode -eq 'Install'){TryRecord 'ENGINE_AUTHENTICATED_EXISTING' 'TASK_UNCHANGED'}
  Emit 'JREI_ENGINE_AUTHENTICATED_EXISTING'
  return
 }
 if(OwnerReady){
  if(TryOwnerApprovedBundledHandover){
   if($Mode -eq 'Install'){TryRecord 'ENGINE_AUTHENTICATED_BUNDLED' 'OWNER_APPROVED_IDLE_HANDOVER'}
   Emit 'JREI_ENGINE_AUTHENTICATED_BUNDLED'
   return
  }
  if($Mode -eq 'Install'){
   TryRecord 'ENGINE_PENDING_PREVIOUS_VERSION_8092_PRESERVED' 'HANDOVER_HELD'
  }
  Emit 'JREI_ENGINE_PENDING_PREVIOUS_VERSION_8092_PRESERVED'
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
} |
     Select-Object -First 35)
   foreach($folder in $versions){
    if($folder.Attributes -band [IO.FileAttributes]::ReparsePoint){continue}
    if($folder.FullName -ieq $PSScriptRoot){continue}
    $v=$folder.Name.Substring(1)
    $source=Join-Path $folder.FullName ('source-v'+$v+'\platform\jrei-v5\windows-desktop')
    $a=Join-Path $source 'jrei_embedded_engine.py'
    $b=Join-Path $source 'jrei_owner_python_bootstrap.py'
    $controller=Join-Path $folder.FullName 'jrei-engine-setup.ps1'
    $manifest=Join-Path $folder.FullName 'jrei-engine-manifest.json'
    if(-not (SafeFile $controller 60000) -or -not (SafeFile $manifest 10000)){
     continue
    }
    $launchedFromA=((SafeFile $a 200000) -and
      $command.IndexOf($a,[StringComparison]::OrdinalIgnoreCase) -ge 0)
    $launchedFromB=((SafeFile $b 200000) -and
      $command.IndexOf($b,[StringComparison]::OrdinalIgnoreCase) -ge 0)
    if(-not ($launchedFromA -or $launchedFromB)){continue}
    $previous=Get-Content -LiteralPath $manifest -Raw -Encoding UTF8 |
      ConvertFrom-Json -ErrorAction Stop
    if($previous.schema -cne 'jr.jrei.offline-engine-package.v1' -or
       $previous.source_branch -cne 'migration/bertina-linux6' -or
       [string]$previous.source_commit -cnotmatch '^[a-f0-9]{40}
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
 if(ReadyForThisRelease){
  if($Mode -eq 'Install'){TryRecord 'ENGINE_AUTHENTICATED_EXISTING' 'TASK_UNCHANGED'}
  Emit 'JREI_ENGINE_AUTHENTICATED_EXISTING'
  return
 }
 if(OwnerReady){
  # An authenticated old JREI must not be mistaken for the new package.
  if($Mode -eq 'Install'){
   TryRecord 'ENGINE_PENDING_PREVIOUS_VERSION_8092_PRESERVED' 'TASK_UNCHANGED'
  }
  Emit 'JREI_ENGINE_PENDING_PREVIOUS_VERSION_8092_PRESERVED'
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
){
     continue
    }
    $prior=$controller
    break
   }
   if($prior){break}
  }
  if(-not $prior){return $false}
  # Repeat authenticated idle check immediately before switching.
  if(-not (OwnerReady) -or $script:LastOwnerStatus.busy -ne $false -or
     $script:LastOwnerStatus.owner_activity_recent -ne $false){return $false}
  Stop-Process -Id $oldPid -ErrorAction Stop
  $stopped=$true
  $freed=$false
  for($n=0;$n -lt 20;$n++){
   if(-not (PortBusy)){$freed=$true;break}
   Start-Sleep -Milliseconds 500
  }
  if(-not $freed){return $false}
  if((LaunchBundled) -and (ReadyForThisRelease)){
   return $true
  }
  return $false
 }catch{
  return $false
 }finally{
  # If the new core did not become verified, attempt to restore the exact
  # previous owner's release, never an unrelated system process.
  if($stopped -and $prior -and -not (ReadyForThisRelease) -and
     -not (PortBusy)){
   try{
    $ps=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    if(SafeFile $ps 3000000){
     & $ps -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $prior -Mode Start 2>$null | Out-Null
    }
   }catch{}
  }
 }
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
 if(ReadyForThisRelease){
  if($Mode -eq 'Install'){TryRecord 'ENGINE_AUTHENTICATED_EXISTING' 'TASK_UNCHANGED'}
  Emit 'JREI_ENGINE_AUTHENTICATED_EXISTING'
  return
 }
 if(OwnerReady){
  # An authenticated old JREI must not be mistaken for the new package.
  if($Mode -eq 'Install'){
   TryRecord 'ENGINE_PENDING_PREVIOUS_VERSION_8092_PRESERVED' 'TASK_UNCHANGED'
  }
  Emit 'JREI_ENGINE_PENDING_PREVIOUS_VERSION_8092_PRESERVED'
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
