#Requires -Version 5.1
<#
  SOURCE-ONLY candidate for the already installed JREI 16-GB Radeon Vulkan task.
  Stage: prepare an owner-only API key and an immutable secure launcher snapshot.
  Run: after independent final Windows acceptance + reviewed task migration,
       run the ORIGINAL verified Qwen3 GGUF on 127.0.0.1:8082 with API key.
  Stage NEVER stops the installed task or modifies its action. This script
  never edits JREI v18, Bertina, Python 8091, original CPU 8081, or drivers.
#>
[CmdletBinding()]
param(
  [ValidateSet('Status','Stage','Run')][string]$Mode='Status',
  [switch]$OwnerApproved
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if($env:OS -cne 'Windows_NT'){throw 'JREI_GPU_REQUIRES_WINDOWS'}
$root=Join-Path $env:LOCALAPPDATA 'JREI-GPU-Lab'
$private=Join-Path $env:LOCALAPPDATA 'JREI\command-center'
$owner=[Security.Principal.WindowsIdentity]::GetCurrent().Name
$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$cfgPath=Join-Path $root 'gpu-owner-16gb.json'
$modelRecord=Join-Path $root 'gpu-model-owner-v4.json'
$modelPath=Join-Path $root 'models\Qwen3-4B-Q4_K_M.gguf'
$backendRoot=Join-Path $root 'llama-b11932-vulkan'
$oldRunner=Join-Path $root 'jrei-gpu-16gb-approved.ps1'
$taskName='JREI-GPU-Qwen-Private'
$stageDir=Join-Path $root 'secure-approved'
$launcher=Join-Path $stageDir 'jrei-gpu-secure-runtime-v1.ps1'
$manifestPath=Join-Path $stageDir 'secure-runtime-v1.json'
$keyPath=Join-Path $private 'gpu-pilot-api-key.txt'
$expectedModel='7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5'
$schema='jr.jrei.gpu-secure-staging.v1'
$api='http://127.0.0.1:8082'
function Require([bool]$condition,[string]$code){if(-not $condition){throw $code}}
function Hash([string]$p){return (Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash.ToLowerInvariant()}
function Json([string]$p){
 Require (Test-Path -LiteralPath $p -PathType Leaf) 'JREI_GPU_STAGING_FILE_MISSING'
 return (Get-Content -LiteralPath $p -Raw -Encoding UTF8 | ConvertFrom-Json)
}
function PathEquals([string]$a,[string]$b){
 return [IO.Path]::GetFullPath($a).Equals(
   [IO.Path]::GetFullPath($b),[StringComparison]::OrdinalIgnoreCase)
}
function ModelAndBackend {
 $c=Json $cfgPath
 $s=Json $modelRecord
 Require ($c.schema -ceq 'jrei.rx580.8gb.owner-private.v1' -and
   $c.owner -ceq $owner -and $c.port -eq 8082 -and
   @(8,16,37).Contains([int]$c.layers)) 'JREI_GPU_APPROVED_TASK_POLICY_MISMATCH'
 Require ($s.schema -ceq 'jr.jrei.owner-gpu-model.v4' -and
   $s.owner -ceq $owner -and $s.ownerApproved -eq $true -and
   $s.rightsReviewed -eq $true -and $s.publicChatEnabled -eq $false -and
   [string]$s.modelSha256 -ceq $expectedModel) 'JREI_GPU_MODEL_OWNER_GATE_FAILED'
 Require (PathEquals ([string]$s.modelFile) $modelPath) 'JREI_GPU_MODEL_PATH_MISMATCH'
 Require (Test-Path -LiteralPath $modelPath -PathType Leaf) 'JREI_GPU_MODEL_FILE_MISSING'
 Require ((Get-Item -LiteralPath $modelPath).Length -eq 2497280256) 'JREI_GPU_MODEL_SIZE_MISMATCH'
 Require ((Hash $modelPath) -ceq $expectedModel) 'JREI_GPU_MODEL_SHA256_MISMATCH'
 $exes=@(Get-ChildItem -LiteralPath $backendRoot -Filter 'llama-server.exe' -File -Recurse -ErrorAction Stop)
 Require ($exes.Count -eq 1) 'JREI_GPU_BACKEND_AMBIGUOUS'
 $exe=$exes[0].FullName
 Require ((Hash $exe) -ceq [string]$c.exeSha256) 'JREI_GPU_BACKEND_HASH_MISMATCH'
 return @{ Executable=$exe; Layers=[int]$c.layers; Original=$c }
}
function TaskIdentity {
 $t=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
 Require ($null -ne $t) 'JREI_GPU_EXISTING_TASK_MISSING'
 Require ($t.Principal.UserId -ceq $owner -and $t.Principal.RunLevel -eq 'Limited') 'JREI_GPU_TASK_PRINCIPAL_MISMATCH'
 Require (@($t.Actions).Count -eq 1) 'JREI_GPU_TASK_ACTION_COUNT_CHANGED'
 $cmd=[string]$t.Actions[0].Arguments
 Require ($cmd.Contains($oldRunner) -or $cmd.Contains($launcher)) 'JREI_GPU_TASK_ACTION_NOT_RECOGNIZED'
 return $t
}
function KeyStatus {
 if(-not (Test-Path -LiteralPath $keyPath -PathType Leaf)){return $false}
 $content=Get-Content -LiteralPath $keyPath -Raw -Encoding ASCII
 return ($content.Trim() -cmatch '^[a-f0-9]{64}$')
}
if($Mode -eq 'Status'){
 Write-Output ('JREI_GPU_SECURITY_STAGED='+([bool](Test-Path $manifestPath -PathType Leaf)))
 Write-Output ('JREI_GPU_OWNER_KEY_PRESENT='+([bool](KeyStatus)))
 Write-Output 'JREI_GPU_LIVE_TASK_NOT_CHANGED_BY_STATUS'
 Write-Output 'SECURE_MODEL_ENDPOINT_NOT_CLAIMED_UNTIL_FINAL_ACCEPTANCE'
 return
}
if($Mode -eq 'Stage'){
 Require ([bool]$OwnerApproved) 'JREI_GPU_SECURE_STAGING_OWNER_APPROVAL_REQUIRED'
 $b=ModelAndBackend
 $c=$b.Original
 Require (Test-Path -LiteralPath $oldRunner -PathType Leaf) 'JREI_GPU_ORIGINAL_APPROVED_SCRIPT_MISSING'
 Require ((Hash $oldRunner) -ceq [string]$c.scriptSha256) 'JREI_GPU_ORIGINAL_SCRIPT_HASH_MISMATCH'
 $task=TaskIdentity
 Require (-not (Test-Path -LiteralPath $keyPath)) 'JREI_GPU_EXISTING_AUTH_KEY_REVIEW_REQUIRED'
 Require (-not (Test-Path -LiteralPath $launcher)) 'JREI_GPU_EXISTING_SECURE_LAUNCHER_REVIEW_REQUIRED'
 Require (-not (Test-Path -LiteralPath $manifestPath)) 'JREI_GPU_EXISTING_STAGING_MANIFEST_REVIEW_REQUIRED'
 Require (-not (PathEquals $PSCommandPath $launcher)) 'JREI_GPU_SOURCE_NOT_STAGING_SNAPSHOT'
 $null=New-Item -ItemType Directory -Path $private -Force
 $null=New-Item -ItemType Directory -Path $stageDir -Force
 # Cryptographic key never appears in console output, Git or task arguments.
 $bytes=New-Object byte[] 32
 $rng=[Security.Cryptography.RandomNumberGenerator]::Create()
 try{$rng.GetBytes($bytes)}finally{$rng.Dispose()}
 $token=[BitConverter]::ToString($bytes).Replace('-','').ToLowerInvariant()
 $stream=[IO.File]::Open($keyPath,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
 try{
   $data=[Text.Encoding]::ASCII.GetBytes($token+[Environment]::NewLine)
   $stream.Write($data,0,$data.Length)
 }finally{$stream.Dispose()}
 $token=$null
 # Disable inherited Windows ACLs and grant this account exclusive access.
 $icacls=Join-Path $env:WINDIR 'System32\icacls.exe'
 Require (Test-Path -LiteralPath $icacls -PathType Leaf) 'JREI_GPU_WINDOWS_ACL_TOOL_MISSING'
 & $icacls $keyPath '/inheritance:r' '/grant:r' ("*{0}:(F)" -f $sid) | Out-Null
 if($LASTEXITCODE -ne 0){
   Remove-Item -LiteralPath $keyPath -Force -ErrorAction SilentlyContinue
   throw 'JREI_GPU_KEY_ACL_REQUIRES_OWNER_REVIEW'
 }
 Copy-Item -LiteralPath $PSCommandPath -Destination $launcher -ErrorAction Stop
 $payload=[ordered]@{
   schema=$schema
   owner=$owner
   ownerSid=$sid
   originalTaskName=$taskName
   originalApprovedLauncherSha256=[string]$c.scriptSha256
   secureLauncherSha256=Hash $launcher
   executableSha256=[string]$c.exeSha256
   modelSha256=$expectedModel
   gpuLayers=$b.Layers
   endpoint=$api
   corsOrigin='http://127.0.0.1:8092'
   keyFile=$keyPath
   stageOnly=$true
 }
 [IO.File]::WriteAllText($manifestPath,($payload|ConvertTo-Json -Depth 4),[Text.UTF8Encoding]::new($false))
 Write-Output 'JREI_GPU_HARDENING_SOURCE_STAGED_NOT_ACTIVATED'
 Write-Output 'EXISTING_SCHEDULED_TASK_UNMODIFIED'
 Write-Output 'SECURE_LAUNCHER_PINNED_FOR_FINAL_OWNER_REVIEW'
 return
}
# Run is not part of Stage: it is the candidate command ONLY AFTER an
# owner-approved, final-acceptance task-action migration to the pinned snapshot.
Require ([bool]$OwnerApproved) 'JREI_GPU_SECURE_RUN_OWNER_APPROVAL_REQUIRED'
Require (PathEquals $PSCommandPath $launcher) 'JREI_GPU_RUN_REQUIRES_IMMUTABLE_APPROVED_SNAPSHOT'
$m=Json $manifestPath
Require ($m.schema -ceq $schema -and $m.owner -ceq $owner -and
 $m.ownerSid -ceq $sid -and $m.stageOnly -eq $true -and
 $m.endpoint -ceq $api -and $m.corsOrigin -ceq 'http://127.0.0.1:8092') 'JREI_GPU_SECURE_MANIFEST_INVALID'
Require ((Hash $PSCommandPath) -ceq [string]$m.secureLauncherSha256) 'JREI_GPU_SECURE_SCRIPT_CHANGED'
Require (([string]$m.keyFile) -ceq $keyPath -and (KeyStatus)) 'JREI_GPU_OWNER_KEY_NOT_READY'
$task=TaskIdentity
Require ($task.Actions[0].Arguments.Contains($launcher)) 'JREI_GPU_TASK_NOT_PROMOTED_AFTER_ACCEPTANCE'
$b=ModelAndBackend
Require ($b.Layers -eq [int]$m.gpuLayers -and
 (Hash $b.Executable) -ceq [string]$m.executableSha256) 'JREI_GPU_SECURE_RUNTIME_DRIFT'
Require (@(Get-NetTCPConnection -State Listen -LocalPort 8082 -ErrorAction SilentlyContinue).Count -eq 0) 'JREI_GPU_8082_ALREADY_IN_USE'
$lines=@(& $b.Executable --list-devices 2>&1 | ForEach-Object {[string]$_})
$gpu=@($lines | Where-Object {$_ -match 'Vulkan\d+:\s*(?:AMD )?Radeon RX 580(?: Series)?\s*\((\d+) MiB, (\d+) MiB free\)'})
Require ($gpu.Count -eq 1) 'JREI_GPU_VULKAN_DEVICE_NOT_READY'
$found=[regex]::Match($gpu[0],'\((\d+) MiB, (\d+) MiB free\)')
$minimum=if($b.Layers -ge 33){5120}else{3072}
Require ($found.Success -and [int]$found.Groups[1].Value -ge 7168 -and
 [int]$found.Groups[2].Value -ge $minimum) 'JREI_GPU_FREE_VRAM_DEFER'
$args=@('--model',('"'+$modelPath+'"'),'--alias','jrei-gpu-lab',
  '--host','127.0.0.1','--port','8082','--ctx-size','1024',
  '--parallel','1','--threads','4','--n-gpu-layers',[string]$b.Layers,
  '--api-key-file',('"'+$keyPath+'"'),'--cors-origins','http://127.0.0.1:8092',
  '--no-cors-credentials','--no-webui')
$err=Join-Path $root 'jrei-gpu-secure-stderr.log'
$out=Join-Path $root 'jrei-gpu-secure-stdout.log'
$p=Start-Process -FilePath $b.Executable -ArgumentList $args -PassThru -RedirectStandardError $err -RedirectStandardOutput $out
Require ($null -ne $p) 'JREI_GPU_SECURE_MODEL_PROCESS_NOT_STARTED'
try{$p.WaitForExit()}finally{
 if(-not $p.HasExited){Stop-Process -Id $p.Id -ErrorAction SilentlyContinue}
}
