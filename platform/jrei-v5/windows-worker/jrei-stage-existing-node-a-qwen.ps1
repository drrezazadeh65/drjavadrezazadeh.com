#Requires -Version 5.1
<#
 Stages the already-observed Qwen3-4B model on OWNER NODE A only.
 One-time owner action; never downloads, installs, starts, registers, or
 uploads anything. Preserve the existing signed worker identity, DPAPI key,
 settings outside localChat, and original Bertina authority. Public/local
 inference remains OFF until separate scientific and production acceptance.
 Prior owner-reported hashes are pinned below. Hash mismatch aborts.
#>
[CmdletBinding()]
param([switch]$OwnerApproved)
$ErrorActionPreference='Stop'
if(-not $OwnerApproved){ throw 'JREI_STAGE_EXPLICIT_OWNER_APPROVAL_REQUIRED' }
if($env:OS -ne 'Windows_NT'){ throw 'JREI_STAGE_WINDOWS_ONLY' }

$expectedModel='7485fe6f11af29433b5c1cab58009521f205840f5b4ae3a32fa7f92e8534fdf5'
$expectedServer='0dd502d324329cf7be521d8bdb68a677a94f1fa3815f7444dd342778b484f820'
$root=Join-Path $env:LOCALAPPDATA 'JREI'
$configPath=Join-Path $root 'jrei-worker-config.json'
$exe=Join-Path $env:USERPROFILE 'Desktop\New folder\llama-server.exe'
$blobs=Join-Path $env:USERPROFILE '.cache\huggingface\hub\models--Qwen--Qwen3-4B-GGUF\blobs'

if(-not (Test-Path -LiteralPath $configPath -PathType Leaf)){
  throw 'JREI_STAGE_EXISTING_PRIVATE_CONFIG_MISSING'
}
if(-not (Test-Path -LiteralPath $exe -PathType Leaf)){
  throw 'JREI_STAGE_EXISTING_LLAMA_SERVER_MISSING'
}
if(-not (Test-Path -LiteralPath $blobs -PathType Container)){
  throw 'JREI_STAGE_EXISTING_HF_CACHE_MISSING'
}
$files=@(Get-ChildItem -LiteralPath $blobs -File -ErrorAction Stop |
  Where-Object {$_.Length -gt 1GB -and $_.Length -lt 8GB})
if($files.Count -ne 1){ throw 'JREI_STAGE_AMBIGUOUS_EXISTING_MODEL' }
$originalModel=$files[0].FullName
$stream=[IO.File]::OpenRead($originalModel)
try{
  $magic=New-Object byte[] 4
  if($stream.Read($magic,0,4) -ne 4 -or
    [Text.Encoding]::ASCII.GetString($magic) -cne 'GGUF'){
    throw 'JREI_STAGE_INVALID_GGUF_MAGIC'
  }
} finally { $stream.Dispose() }

$actualModel=(Get-FileHash -LiteralPath $originalModel -Algorithm SHA256).Hash.ToLowerInvariant()
$actualServer=(Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLowerInvariant()
if($actualModel -cne $expectedModel -or
   $actualServer -cne $expectedServer){
  throw 'JREI_STAGE_MODEL_OR_BINARY_HASH_CHANGED'
}

try {
  $cfg=Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
} catch { throw 'JREI_STAGE_PRIVATE_CONFIG_UNREADABLE' }
if($null -eq $cfg -or
   $cfg.protocol -cne 'jr.jrei.windows-worker.v1' -or
   $cfg.origin -cne 'https://drjavadrezazadeh.com' -or
   [string]$cfg.nodeId -notmatch '^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$'){
  throw 'JREI_STAGE_EXISTING_WORKER_IDENTITY_INVALID'
}
if($null -eq $cfg.localChat){
  $cfg | Add-Member -MemberType NoteProperty -Name 'localChat' -Value ([pscustomobject]@{})
}
$chat=$cfg.localChat
if($chat.enabled -eq $true){
  throw 'JREI_STAGE_EXISTING_LIVE_CHAT_MUST_NOT_BE_OVERWRITTEN'
}

$models=Join-Path $root 'models'
$modelPath=Join-Path $models 'Qwen3-4B-Q4_K_M.gguf'
if(-not (Test-Path -LiteralPath $models -PathType Container)){
  New-Item -ItemType Directory -Path $models -Force | Out-Null
}
if(Test-Path -LiteralPath $modelPath){
  if(-not (Test-Path -LiteralPath $modelPath -PathType Leaf)){
    throw 'JREI_STAGE_DESTINATION_NOT_A_FILE'
  }
  if((Get-FileHash -LiteralPath $modelPath -Algorithm SHA256).Hash.ToLowerInvariant() -cne $actualModel){
    throw 'JREI_STAGE_DESTINATION_MODEL_MISMATCH'
  }
} else {
  # Both files reside on the owner's same Windows system volume. A hardlink
  # does not copy another multi-GB model or alter the original cached bytes.
  try{
    New-Item -ItemType HardLink -Path $modelPath -Target $originalModel -ErrorAction Stop | Out-Null
  } catch {throw 'JREI_STAGE_HARDLINK_UNAVAILABLE_NO_MODEL_COPIED'}
}
if((Get-FileHash -LiteralPath $modelPath -Algorithm SHA256).Hash.ToLowerInvariant() -cne $expectedModel){
  throw 'JREI_STAGE_STAGED_GGUF_HASH_MISMATCH'
}

function Set-JreiProperty([object]$o,[string]$name,$value){
  if($null -ne $o.PSObject.Properties[$name]){$o.$name=$value}
  else{$o | Add-Member -MemberType NoteProperty -Name $name -Value $value}
}
# Preserve the entire existing signed worker identity and polling config.
Set-JreiProperty $chat 'modelId' 'jrei-qwen3-4b-q4km'
Set-JreiProperty $chat 'modelVersion' 'qwen3-4b-q4km-20261025'
Set-JreiProperty $chat 'modelFile' $modelPath
Set-JreiProperty $chat 'modelSha256' $actualModel
Set-JreiProperty $chat 'backendExe' $exe
Set-JreiProperty $chat 'backendExeSha256' $actualServer
Set-JreiProperty $chat 'endpoint' 'http://127.0.0.1:8081/v1/chat/completions'
Set-JreiProperty $chat 'disableThinking' $true
Set-JreiProperty $chat 'pollSeconds' 3
Set-JreiProperty $chat 'idlePollMaxSeconds' 20
Set-JreiProperty $chat 'modelTimeoutMs' 30000
Set-JreiProperty $chat 'maxContextTokens' 240
Set-JreiProperty $chat 'enabled' $false
Set-JreiProperty $chat 'ownerApproved' $true
# Neither a localhost smoke test nor a licence statement alone establishes
# independent quality acceptance or a production model release decision.
Set-JreiProperty $chat 'rightsReviewed' $false
Set-JreiProperty $chat 'modelRuntimeVerified' $false
Set-JreiProperty $chat 'independentQualityAccepted' $false

$backup=Join-Path $root ('jrei-worker-config.backup-'+
  ([DateTime]::UtcNow.ToString('yyyyMMddHHmmss'))+'.json')
$temp=Join-Path $root ('jrei-worker-config.'+[guid]::NewGuid().ToString('N')+'.tmp')
try{
  $json=ConvertTo-Json -InputObject $cfg -Depth 30
  [IO.File]::WriteAllText($temp,$json,[Text.UTF8Encoding]::new($false))
  # Atomically replace ONLY the existing private config; keep a backup
  # beside it with the existing restricted directory permissions.
  [IO.File]::Replace($temp,$configPath,$backup)
} finally {
  if(Test-Path -LiteralPath $temp){Remove-Item -LiteralPath $temp -Force}
}
Write-Output '[JREI] NODE_A_QWEN_LOCAL_ARTIFACTS_STAGED'
Write-Output '[JREI] GGUF_SHA256_MATCHED'
Write-Output '[JREI] LLAMA_SERVER_SHA256_MATCHED'
Write-Output '[JREI] PRIVATE_CONFIG_BACKUP_CREATED'
Write-Output '[JREI] CHAT_PUBLIC_ACTIVATION_OFF'
Write-Output '[JREI] NO_WORKER_KEYS_OR_NODE_REGISTRATION_CHANGED'
Write-Output '[JREI] NO_DOWNLOAD_NO_PYTHON_NO_DEPLOYMENT'
