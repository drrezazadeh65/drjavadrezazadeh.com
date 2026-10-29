#Requires -Version 5.1
<#
 JREI owner-device inventory; works before node enrollment on any Windows x64 PC.
 This is a bounded READ-ONLY UI prerequisite report. No model, Git,
 Node.js, Python, network requests, key creation, registration, tests, elevated
 permissions, scheduled task changes or installation steps are executed.
 Hardware values are observations, NOT signed worker/GPU proof.
#>
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if($env:OS -cne 'Windows_NT'){throw 'JREI_DEVICE_WINDOWS_REQUIRED'}
if(-not [Environment]::Is64BitOperatingSystem){
 throw 'JREI_DEVICE_WINDOWS_X64_REQUIRED'
}
$homePath=$env:LOCALAPPDATA
if([string]::IsNullOrWhiteSpace($homePath)){throw 'JREI_DEVICE_USER_PROFILE_MISSING'}
$cfgPath=Join-Path $homePath 'JREI\jrei-worker-config.json'
$keyPath=Join-Path $homePath 'JREI\jrei-worker-key.dpapi'
$tokenPath=Join-Path $homePath 'JREI\command-center\owner-token'
$repoPath=Join-Path $homePath 'JREI-Python\repo'
$pythonPath=Join-Path $homePath 'JREI-Python\venv\Scripts\python.exe'
$taskName='JREI-Owner-Windows-Command-Center'
$state='NEW_NODE_OWNER_ENROLLMENT_REQUIRED'
$node='NOT_REGISTERED_LOCALLY'
$configPresent=$false
$keyPresent=$false
if(Test-Path -LiteralPath $cfgPath -PathType Leaf){
 $cfgFile=Get-Item -LiteralPath $cfgPath -ErrorAction Stop
 if($cfgFile.Attributes -band [IO.FileAttributes]::ReparsePoint){
  $state='PRIVATE_CONFIG_REPARSE_POINT_REJECTED'
 }elseif($cfgFile.Length -gt 65536 -or $cfgFile.Length -le 0){
  $state='PRIVATE_CONFIG_SIZE_INVALID'
 }else{
  try {
   $c=Get-Content -LiteralPath $cfgPath -Raw -Encoding UTF8 | ConvertFrom-Json
   $configPresent=$true
   $id=[string]$c.nodeId
   if($c.protocol -cne 'jr.jrei.windows-worker.v1' -or
      $c.origin -cne 'https://drjavadrezazadeh.com' -or
      $id -cnotmatch '^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$'){
    $state='EXISTING_PRIVATE_CONFIG_REVIEW_REQUIRED'
   }else{
    $node='EXISTING_NODE_ID_PRESENT'
    $state='EXISTING_NODE_CONFIG_PRESENT_REMOTE_STATUS_UNVERIFIED'
   }
  }catch{
   $state='EXISTING_PRIVATE_CONFIG_UNREADABLE'
  }
 }
}
if(Test-Path -LiteralPath $keyPath -PathType Leaf){
 $keyFile=Get-Item -LiteralPath $keyPath -ErrorAction Stop
 $keyPresent=((-not ($keyFile.Attributes -band [IO.FileAttributes]::ReparsePoint)) -and
               $keyFile.Length -gt 0 -and $keyFile.Length -le 16384)
}
if($state -eq 'EXISTING_NODE_CONFIG_PRESENT_REMOTE_STATUS_UNVERIFIED' -and
   -not $keyPresent){
 $state='EXISTING_NODE_SIGNING_KEY_NEEDS_OWNER_REVIEW'
}
if($state -eq 'NEW_NODE_OWNER_ENROLLMENT_REQUIRED' -and $keyPresent){
 $state='ORPHAN_EXISTING_NODE_KEY_REQUIRES_OWNER_REVIEW'
}
$ramGB=$null
$cpuThreads=$null
try{
 $computer=Get-CimInstance Win32_ComputerSystem -ErrorAction Stop
 $ramGB=[math]::Round([double]$computer.TotalPhysicalMemory/1GB,1)
 $cpuThreads=[int]$computer.NumberOfLogicalProcessors
}catch{
 # Do not fake hardware measurements when Windows blocks this API.
}
# GPU name is WMI self-reported inventory, never CUDA/DirectML proof.
$gpuNames=@()
try{
 $gpuNames=@(Get-CimInstance Win32_VideoController -ErrorAction Stop |
  Select-Object -First 4 | ForEach-Object {
   if(-not [string]::IsNullOrWhiteSpace($_.Name)){
    ([string]$_.Name).Substring(0,[math]::Min(90,([string]$_.Name).Length))
   }
  })
}catch{}
$taskPresent=$false
try{
 $t=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
 $taskPresent=($null -ne $t)
}catch{}
# Report the previous offline installer outcome without leaking logs,
# worker keys, private database contents or owner tokens.
$lastSetupState='NO_OFFLINE_ENGINE_RECEIPT'
$receiptPath=Join-Path $homePath 'JREI\command-center\install-receipts\latest-native-setup-receipt.json'
try{
 if(Test-Path -LiteralPath $receiptPath -PathType Leaf){
  $file=Get-Item -LiteralPath $receiptPath -ErrorAction Stop
  if(-not ($file.Attributes -band [IO.FileAttributes]::ReparsePoint) -and
     $file.Length -gt 0 -and $file.Length -le 5000){
   $record=Get-Content -LiteralPath $receiptPath -Encoding UTF8 -Raw |
     ConvertFrom-Json -ErrorAction Stop
   if($record.schema -in @('jr.jrei.offline-owner-install.v1',
                           'jr.jrei.offline-owner-install.v2') -and
      [string]$record.state -cmatch '^[A-Z0-9_]{4,110}$'){
    $lastSetupState=[string]$record.state
   }
  }
 }
}catch{$lastSetupState='INSTALL_RECEIPT_UNREADABLE'}

# v0.1.11 can preserve existing owner files in a same-user, SHA-verified
# alternate private store when the frozen exe cannot write at the old path.
# Inventory is read-only. Never print owner token, worker key or DB contents.
$privateStore='ORIGINAL_OWNER_LOCALAPPDATA'
$alternateRoots=@(
 (Join-Path $homePath 'JREI-Owner\command-center'),
 (Join-Path $env:USERPROFILE 'JREI-Owner\command-center')
)
$verifiedFallbacks=@()
foreach($candidate in $alternateRoots){
 $marker=Join-Path $candidate '.jrei-active-private-store-v1.json'
 try{
  if(-not (Test-Path -LiteralPath $marker -PathType Leaf)){continue}
  $markFile=Get-Item -LiteralPath $marker -ErrorAction Stop
  if(($markFile.Attributes -band [IO.FileAttributes]::ReparsePoint) -or
     $markFile.Length -gt 2048 -or $markFile.Length -le 0){continue}
  $info=Get-Content -LiteralPath $marker -Raw -Encoding UTF8 |
    ConvertFrom-Json -ErrorAction Stop
  if($info.schema -ceq 'jr.jrei.owner-private-storage-selection.v1' -and
     $info.selected -eq $true){
   $verifiedFallbacks+=,$candidate
  }
 }catch{}
}
if($verifiedFallbacks.Count -eq 1){
 $privateStore='VERIFIED_SAME_USER_FALLBACK'
 $tokenPath=Join-Path $verifiedFallbacks[0] 'owner-token'
}elseif($verifiedFallbacks.Count -gt 1){
 $privateStore='AMBIGUOUS_PRIVATE_STORE_OWNER_REVIEW_REQUIRED'
 $tokenPath=''
}
$report=[ordered]@{
 schema='jr.jrei.windows-dynamic-node-inventory.v1'
 state=$state
 machine_id=$node
 node_slots_fixed=$false
 installer_enforces_node_ceiling=$false
 server_side_node_capacity_not_verified=$true
 ram_gb_observed=$ramGB
 cpu_threads_observed=$cpuThreads
 gpu_adapter_names_observed=$gpuNames
 gpu_adapter_names_are_unverified_windows_claims=$true
 ram_is_not_node_identity=$true
 gpu_compute_verified=$false
 existing_private_config_present=$configPresent
 signing_key_file_present=$keyPresent
 owner_token_file_present=($tokenPath -ne '' -and (Test-Path -LiteralPath $tokenPath -PathType Leaf))
 private_store_class=$privateStore
 original_repo_present=(Test-Path -LiteralPath $repoPath -PathType Container)
 original_python_present=(Test-Path -LiteralPath $pythonPath -PathType Leaf)
 original_command_center_task_present=$taskPresent
 offline_engine_installer_state=$lastSetupState
 real_signed_server_registration_verified=$false
 real_signed_worker_heartbeat_verified=$false
 new_node_requires_server_side_owner_registration=(
   $state -eq 'NEW_NODE_OWNER_ENROLLMENT_REQUIRED')
 user_data_modified=$false
 read_only_inventory_script_executed=$true
 untrusted_code_executed=$false
 installation_performed=$false
}
$report | ConvertTo-Json -Depth 4 -Compress
