#Requires -Version 5.1
<#
 Owner-approved READ-ONLY loopback inference smoke test for staged Node A.
 Validates the existing SHA-pinned GGUF and llama-server without Python,
 uploads, database access, web requests, worker key access, or live enabling.
 It compares /v1/models ID to JREI modelId: manual llama.cpp starts without
 --alias may infer successfully yet be incompatible with signed JREI worker.
 No raw answers, paths, model IDs or credentials are printed.
#>
[CmdletBinding()]
param([switch]$OwnerApproved)
$ErrorActionPreference='Stop'
if(-not $OwnerApproved){throw 'JREI_SMOKE_OWNER_APPROVAL_REQUIRED'}
if($env:OS -ne 'Windows_NT'){throw 'JREI_SMOKE_WINDOWS_ONLY'}
$privateConfig=Join-Path $env:LOCALAPPDATA 'JREI\jrei-worker-config.json'
if(-not (Test-Path -LiteralPath $privateConfig -PathType Leaf)){
  throw 'JREI_SMOKE_PRIVATE_CONFIG_NOT_FOUND'
}
try {
  $cfg=Get-Content -LiteralPath $privateConfig -Raw -Encoding UTF8 | ConvertFrom-Json
} catch {throw 'JREI_SMOKE_PRIVATE_CONFIG_UNREADABLE'}
$c=$cfg.localChat
if($null -eq $c -or $c.ownerApproved -ne $true -or
   [string]$c.modelId -cnotmatch '^[A-Za-z0-9._:-]{1,100}$'){
  throw 'JREI_SMOKE_MODEL_NOT_STAGED'
}
$expectedModel='7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5'
$expectedRuntime='0dd502d324329cf7be521d8bdb68a677a94f1fa3815f7444dd342778b484f820'
if([string]$c.modelSha256 -cne $expectedModel -or
   [string]$c.backendExeSha256 -cne $expectedRuntime){
  throw 'JREI_SMOKE_STAGED_HASH_PIN_MISMATCH'
}
if(-not [IO.Path]::IsPathRooted([string]$c.modelFile) -or
   -not [IO.Path]::IsPathRooted([string]$c.backendExe) -or
   [IO.Path]::GetExtension([string]$c.modelFile).ToLowerInvariant() -ne '.gguf' -or
   [IO.Path]::GetFileName([string]$c.backendExe).ToLowerInvariant() -ne 'llama-server.exe' -or
   -not (Test-Path -LiteralPath $c.modelFile -PathType Leaf) -or
   -not (Test-Path -LiteralPath $c.backendExe -PathType Leaf)){
  throw 'JREI_SMOKE_STAGED_FILES_MISSING'
}
if((Get-FileHash -LiteralPath $c.modelFile -Algorithm SHA256).Hash.ToLowerInvariant() -cne $expectedModel){
  throw 'JREI_SMOKE_GGUF_CHANGED'
}
if((Get-FileHash -LiteralPath $c.backendExe -Algorithm SHA256).Hash.ToLowerInvariant() -cne $expectedRuntime){
  throw 'JREI_SMOKE_RUNTIME_CHANGED'
}
try { $u=[uri]([string]$c.endpoint) }
catch {throw 'JREI_SMOKE_INVALID_LOOPBACK'}
if($u.Scheme -ne 'http' -or $u.Host -ne '127.0.0.1' -or
   $u.AbsolutePath -ne '/v1/chat/completions' -or
   $u.Port -lt 1024 -or $u.Port -gt 65535 -or
   $u.Query -ne '' -or $u.Fragment -ne '' -or
   [string]$u.UserInfo -ne ''){
  throw 'JREI_SMOKE_INVALID_LOOPBACK'
}
$prefix='http://127.0.0.1:'+([string]$u.Port)
try {
  $health=Invoke-RestMethod -Method Get -Uri ($prefix+'/health') -TimeoutSec 8
  if($health.status -ne 'ok'){throw 'NOT_READY'}
} catch {throw 'JREI_SMOKE_LOCAL_BACKEND_UNAVAILABLE'}
try {
  $models=Invoke-RestMethod -Method Get -Uri ($prefix+'/v1/models') -TimeoutSec 8
  $actualModel=[string]$models.data[0].id
  if([string]::IsNullOrWhiteSpace($actualModel) -or
     $actualModel.Length -gt 512){throw 'BAD_ID'}
} catch {throw 'JREI_SMOKE_MODEL_DISCOVERY_FAILED'}
$aliasMatched=($actualModel -ceq [string]$c.modelId)
$body=@{
  model=$actualModel
  messages=@(@{role='user';content='فقط بنویس: سلام /no_think'})
  max_tokens=80
  temperature=0
  stream=$false
  chat_template_kwargs=@{enable_thinking=$false}
} | ConvertTo-Json -Depth 8
$watch=[Diagnostics.Stopwatch]::StartNew()
try {
  $response=Invoke-RestMethod -Uri ([string]$c.endpoint) -Method Post -TimeoutSec 50 -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body))
} catch {throw 'JREI_SMOKE_LOCAL_COMPLETION_UNAVAILABLE'}
$watch.Stop()
$visible=[string]$response.choices[0].message.content
if([string]::IsNullOrWhiteSpace($visible)){throw 'JREI_SMOKE_EMPTY_ANSWER'}
$finished=[string]$response.choices[0].finish_reason
Write-Output '[JREI] MODEL_AND_RUNTIME_SHA256_VERIFIED'
Write-Output '[JREI] LOOPBACK_MODEL_HEALTH_OK'
Write-Output ('[JREI] VISIBLE_FA_COMPLETION='+($visible -match '[\u0600-\u06FF]'))
Write-Output ('[JREI] COMPLETION_FINISH_STOP='+($finished -ceq 'stop'))
Write-Output ('[JREI] TECHNICAL_LATENCY_MS='+$watch.ElapsedMilliseconds)
Write-Output ('[JREI] SERVER_ALIAS_MATCHES_JREI='+$aliasMatched)
Write-Output '[JREI] PUBLIC_ACTIVATION_OFF'
Write-Output '[JREI] NO_PRIVATE_KEYS_NETWORK_UPLOAD_OR_DATABASE_CHANGE'
