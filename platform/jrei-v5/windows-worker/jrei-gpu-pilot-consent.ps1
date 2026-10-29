#Requires -Version 5.1
<# Stages an optional third-party Qwen pilot for the EXISTING JREI owner app.
   Only creates/removes %LOCALAPPDATA%\JREI\command-center\gpu-pilot-consent.json.
   No model downloads, process changes, deployment, driver edits, or restarts.
   Source activation still requires JREI's final integrated release acceptance. #>
[CmdletBinding()]
param([ValidateSet('Status','Enable','Disable')][string]$Mode='Status',
      [switch]$OwnerApproved)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if($env:OS -cne 'Windows_NT'){throw 'JREI_GPU_WINDOWS_ONLY'}
$root=Join-Path $env:LOCALAPPDATA 'JREI-GPU-Lab'
$private=Join-Path $env:LOCALAPPDATA 'JREI\command-center'
$consent=Join-Path $private 'gpu-pilot-consent.json'
$sidecar=Join-Path $root 'gpu-model-owner-v4.json'
$runtime=Join-Path $root 'gpu-owner-16gb.json'
$model=Join-Path $root 'models\Qwen3-4B-Q4_K_M.gguf'
$binaryDir=Join-Path $root 'llama-b11932-vulkan'
$alias='jrei-gpu-lab'
$secureManifestPath=Join-Path $root 'secure-approved\secure-runtime-v1.json'
$secureLauncher=Join-Path $root 'secure-approved\jrei-gpu-secure-runtime-v1.ps1'
$keyPath=Join-Path $private 'gpu-pilot-api-key.txt'
$digest='7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5'
$schema='jr.jrei.owner-private-gpu-pilot.v1'
function Require([bool]$ok,[string]$reason){if(-not $ok){throw $reason}}
function ReadJson([string]$path){
  Require (Test-Path -LiteralPath $path -PathType Leaf) 'JREI_GPU_PRIVATE_FILE_MISSING'
  return (Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json)
}
function State(){
  if(-not (Test-Path -LiteralPath $consent -PathType Leaf)){
    Write-Output 'JREI_GPU_PILOT_CONSENT=OFF'
    return
  }
  $cfg=ReadJson $consent
  Write-Output ('JREI_GPU_PILOT_CONSENT='+$(if($cfg.schema -ceq $schema -and $cfg.enabled -eq $true -and $cfg.owner_approved -eq $true){'ON_SOURCE_ONLY'}else{'INVALID'}))
  Write-Output 'JREI_APP_RELEASE_STATUS=NOT_VERIFIED_BY_THIS_COMMAND'
  Write-Output 'NO_WINDOWS_PROCESS_OR_WEBSITE_CHANGED'
}
if($Mode -eq 'Status'){State;return}
Require ([bool]$OwnerApproved) 'JREI_OWNER_APPROVAL_REQUIRED'
if($Mode -eq 'Disable'){
  Require (Test-Path -LiteralPath $consent -PathType Leaf) 'JREI_GPU_PILOT_CONSENT_ALREADY_OFF'
  $cfg=ReadJson $consent
  Require ($cfg.schema -ceq $schema) 'JREI_UNRECOGNIZED_OWNER_FILE_NOT_DELETED'
  Remove-Item -LiteralPath $consent -Force -ErrorAction Stop
  Write-Output 'JREI_GPU_PILOT_CONSENT_DISABLED'
  Write-Output 'EXISTING_RUNNING_APP_NOT_RESTARTED'
  return
}
Require (-not (Test-Path -LiteralPath $consent)) 'JREI_CONSENT_ALREADY_EXISTS_REVIEW_FIRST'
$owner=[Security.Principal.WindowsIdentity]::GetCurrent().Name
$s=ReadJson $sidecar
$r=ReadJson $runtime
Require ($s.schema -ceq 'jr.jrei.owner-gpu-model.v4' -and
  $s.owner -ceq $owner -and $s.ownerApproved -eq $true -and
  $s.rightsReviewed -eq $true -and $s.publicChatEnabled -eq $false -and
  $s.modelSha256 -ceq $digest) 'JREI_GPU_OWNER_MODEL_GATE_FAILED'
Require (([IO.Path]::GetFullPath([string]$s.modelFile)).Equals(
 [IO.Path]::GetFullPath($model),[StringComparison]::OrdinalIgnoreCase)) 'JREI_MODEL_PATH_MISMATCH'
Require ($r.schema -ceq 'jrei.rx580.8gb.owner-private.v1' -and
  $r.owner -ceq $owner -and $r.port -eq 8082 -and
  @(8,16,37).Contains([int]$r.layers)) 'JREI_GPU_RUNTIME_GATE_FAILED'
Require (Test-Path -LiteralPath $model -PathType Leaf) 'JREI_GPU_MODEL_MISSING'
Require ((Get-Item -LiteralPath $model).Length -eq 2497280256) 'JREI_GPU_MODEL_SIZE_MISMATCH'
Require ((Get-FileHash -LiteralPath $model -Algorithm SHA256).Hash.ToLowerInvariant() -ceq $digest) 'JREI_GPU_MODEL_HASH_MISMATCH'
$exes=@(Get-ChildItem -LiteralPath $binaryDir -Filter llama-server.exe -File -Recurse -ErrorAction Stop)
Require ($exes.Count -eq 1) 'JREI_GPU_RUNTIME_EXE_AMBIGUOUS'
Require ((Get-FileHash -LiteralPath $exes[0].FullName -Algorithm SHA256).Hash.ToLowerInvariant() -ceq [string]$r.exeSha256) 'JREI_GPU_RUNTIME_HASH_MISMATCH'
$conn=@(Get-NetTCPConnection -State Listen -LocalPort 8082 -ErrorAction SilentlyContinue)
Require ($conn.Count -eq 1 -and $conn[0].LocalAddress -eq '127.0.0.1') 'JREI_GPU_SERVER_NOT_EXCLUSIVE_LOOPBACK'
$secure=ReadJson $secureManifestPath
Require ($secure.schema -ceq 'jr.jrei.gpu-secure-staging.v1' -and
  $secure.owner -ceq $owner -and $secure.endpoint -ceq 'http://127.0.0.1:8082' -and
  $secure.corsOrigin -ceq 'http://127.0.0.1:8092' -and
  [string]$secure.keyFile -ceq $keyPath -and
  $secure.modelSha256 -ceq $digest) 'JREI_GPU_SECURE_STAGING_REQUIRED'
Require (Test-Path -LiteralPath $secureLauncher -PathType Leaf) 'JREI_GPU_SECURE_LAUNCHER_MISSING'
Require ((Get-FileHash -LiteralPath $secureLauncher -Algorithm SHA256).Hash.ToLowerInvariant() -ceq
  [string]$secure.secureLauncherSha256) 'JREI_GPU_SECURE_LAUNCHER_HASH_MISMATCH'
Require (Test-Path -LiteralPath $keyPath -PathType Leaf) 'JREI_GPU_OWNER_SECRET_MISSING'
$token=(Get-Content -LiteralPath $keyPath -Encoding ASCII -Raw).Trim()
Require ($token -cmatch '^[a-f0-9]{64}
$payload=[ordered]@{
 schema=$schema;enabled=$true;external_model_acknowledged=$true
 owner_approved=$true;model_sha256=$digest
} | ConvertTo-Json -Depth 3
$f=[IO.File]::Open($consent,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
try{
 $b=[Text.UTF8Encoding]::new($false).GetBytes($payload)
 $f.Write($b,0,$b.Length)
}finally{$f.Dispose()}
Write-Output 'JREI_GPU_PILOT_PRIVATE_CONSENT_STAGED'
Write-Output 'THIRD_PARTY_QWEN_EXPLICITLY_LABELLED_NOT_JREI_NATIVE'
Write-Output 'NO_RESTART_NO_MODEL_DOWNLOAD_NO_WEBSITE_DEPLOYMENT'
Write-Output 'REQUIRES_FINAL_INTEGRATED_WINDOWS_RELEASE_APPROVAL'
) 'JREI_GPU_OWNER_SECRET_INVALID'
# The original unsecured V4 server must NEVER count as an approved pilot.
# In the pinned llama.cpp server /v1/models must reject unauthenticated GET.
$unauthDenied=$false
try {
  $null=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8082/v1/models' -TimeoutSec 5 -ErrorAction Stop
}catch{
  try {$unauthDenied=([int]$_.Exception.Response.StatusCode -eq 401)}catch{}
}
Require $unauthDenied 'JREI_GPU_SERVER_AUTH_NOT_ENFORCED'
$models=Invoke-RestMethod -Uri 'http://127.0.0.1:8082/v1/models' -TimeoutSec 5 -Headers @{
  Authorization=('Bearer '+$token)
}
Require (@($models.data | Where-Object {$_.id -ceq $alias}).Count -gt 0) 'JREI_GPU_SECURE_MODEL_API_NOT_READY'
$token=$null
$null=New-Item -ItemType Directory -Path $private -Force
# File creation is atomic against another enabler; refuse existing consent.
$payload=[ordered]@{
 schema=$schema;enabled=$true;external_model_acknowledged=$true
 owner_approved=$true;model_sha256=$digest
} | ConvertTo-Json -Depth 3
$f=[IO.File]::Open($consent,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
try{
 $b=[Text.UTF8Encoding]::new($false).GetBytes($payload)
 $f.Write($b,0,$b.Length)
}finally{$f.Dispose()}
Write-Output 'JREI_GPU_PILOT_PRIVATE_CONSENT_STAGED'
Write-Output 'THIRD_PARTY_QWEN_EXPLICITLY_LABELLED_NOT_JREI_NATIVE'
Write-Output 'NO_RESTART_NO_MODEL_DOWNLOAD_NO_WEBSITE_DEPLOYMENT'
Write-Output 'REQUIRES_FINAL_INTEGRATED_WINDOWS_RELEASE_APPROVAL'
