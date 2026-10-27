#Requires -Version 5.1
<#
 JREI isolated GPU inference diagnostics (never installs, trains, or changes
 existing Qwen 8081/Python 8091 or owner private configuration).
 Requires the official hash-verified llama.cpp b11932 Vulkan ZIP already
 downloaded and extracted in %LOCALAPPDATA%\JREI-GPU-Lab.
#>
[CmdletBinding()]
param(
  [ValidateRange(0,16)][int]$GpuLayers=4,
  [switch]$ThroughputProbe
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if($env:OS -cne 'Windows_NT'){throw 'JREI_GPU_WINDOWS_ONLY'}
$root=Join-Path $env:LOCALAPPDATA 'JREI-GPU-Lab'
$folder=Join-Path $root 'llama-b11932-vulkan'
$zip=Join-Path $root 'llama-b11932-vulkan.zip'
$cfgPath=Join-Path $env:LOCALAPPDATA 'JREI\jrei-worker-config.json'
$expectedZipSha='64e4872836d633f496a46504f6fea407d1fdd4e84f6137df33cae513e3fbd13c'
if(-not (Test-Path -LiteralPath $cfgPath -PathType Leaf)){throw 'JREI_PRIVATE_CONFIG_NOT_FOUND'}
if(-not (Test-Path -LiteralPath $zip -PathType Leaf)){throw 'JREI_VERIFIED_VULKAN_ARCHIVE_REQUIRED'}
if((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant() -cne $expectedZipSha){throw 'JREI_VULKAN_ARCHIVE_SHA256_MISMATCH'}
$cfg=Get-Content -LiteralPath $cfgPath -Raw -Encoding UTF8 | ConvertFrom-Json
if($cfg.localChat.ownerApproved -ne $true -or $cfg.localChat.rightsReviewed -ne $true){throw 'JREI_MODEL_OWNER_RIGHTS_GATE_MISSING'}
$model=[string]$cfg.localChat.modelFile
$expectedModel=[string]$cfg.localChat.modelSha256
if(-not [IO.Path]::IsPathRooted($model) -or -not (Test-Path -LiteralPath $model -PathType Leaf) -or $expectedModel -cnotmatch '^[a-f0-9]{64}$'){throw 'JREI_APPROVED_MODEL_MISSING'}
if((Get-FileHash -LiteralPath $model -Algorithm SHA256).Hash.ToLowerInvariant() -cne $expectedModel){throw 'JREI_APPROVED_MODEL_HASH_MISMATCH'}
$executables=@(Get-ChildItem -LiteralPath $folder -Filter 'llama-server.exe' -File -Recurse -ErrorAction Stop)
if($executables.Count -ne 1){throw 'JREI_VULKAN_LAB_BACKEND_AMBIGUOUS'}
$exe=$executables[0]
$listeners=@(Get-NetTCPConnection -State Listen -LocalPort 8082 -ErrorAction SilentlyContinue)
if($listeners.Count -ne 0){throw 'JREI_LAB_PORT_8082_OCCUPIED'}
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
$err=Join-Path $root "gpu-single-$stamp-stderr.log"
$out=Join-Path $root "gpu-single-$stamp-stdout.log"
$arguments=@(
  '--model', ('"'+$model.Replace('"','')+'"'),
  '--alias','jrei-gpu-lab','--host','127.0.0.1','--port','8082',
  '--ctx-size','1024','--threads','4','--parallel','1',
  '--log-verbosity','4','--n-gpu-layers',[string]$GpuLayers
)
# Force the baseline to CPU-only. Otherwise Vulkan may offload operator
# kernels with zero weight layers and invalidate the comparison.
if($GpuLayers -eq 0){
  $arguments+=@('--device','none','--no-op-offload')
}
function Get-OptionalJsonField($Object,[string]$PropertyName){
  # llama-server response schemas differ: reasoning_content and usage can
  # be entirely absent under Set-StrictMode -Version Latest.
  if($null -eq $Object){return $null}
  $property=$Object.PSObject.Properties[$PropertyName]
  if($null -eq $property){return $null}
  return $property.Value
}
$lab=$null
try{
  Write-Output ('[JREI] GPU_LAYER_REQUEST='+$GpuLayers)
  $lab=Start-Process -FilePath $exe.FullName -ArgumentList $arguments -RedirectStandardError $err -RedirectStandardOutput $out -PassThru
  if($null -eq $lab){throw 'JREI_LAB_PROCESS_NOT_STARTED'}
  $ready=$false
  for($i=0;$i -lt 60;$i++){
    Start-Sleep -Seconds 2
    $lab.Refresh()
    if($lab.HasExited){break}
    try{
      $models=Invoke-RestMethod -Uri 'http://127.0.0.1:8082/v1/models' -TimeoutSec 3
      if(@($models.data | Where-Object {$_.id -eq 'jrei-gpu-lab'}).Count -gt 0){$ready=$true;break}
    }catch{}
  }
  if(-not $ready){throw 'JREI_VULKAN_SERVER_NOT_READY'}
  $userPrompt=if($ThroughputProbe){
    '/no_think'+[Environment]::NewLine+
    'In plain English, explain five practical differences between supervised and unsupervised machine learning. Use five numbered sentences, each with at least fifteen words. Answer directly without a hidden analysis.'
  }else{
    '/no_think'+[Environment]::NewLine+'Reply with exactly one word: Hello'
  }
  Write-Output ('[JREI] THROUGHPUT_PROBE='+[bool]$ThroughputProbe)
  $maxTokens=if($ThroughputProbe){256}else{192}
  $body=@{
    model='jrei-gpu-lab'
    messages=@(
      @{role='system';content='Answer without reasoning text. Give only the requested final answer.'},
      @{role='user';content=$userPrompt}
    )
    max_tokens=$maxTokens
    temperature=0
    stream=$false
    chat_template_kwargs=@{enable_thinking=$false}
  } | ConvertTo-Json -Depth 8
  $clock=[Diagnostics.Stopwatch]::StartNew()
  $reply=Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8082/v1/chat/completions' -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 120
  $clock.Stop()
  # An HTTP 200 from llama.cpp does not require reasoning_content or usage.
  # Missing *required* OpenAI-like choices is a fail-closed schema error.
  $choices=Get-OptionalJsonField $reply 'choices'
  if($null -eq $choices -or @($choices).Count -lt 1){
    throw 'JREI_INFERENCE_RESPONSE_MISSING_CHOICES'
  }
  $choice=@($choices)[0]
  $message=Get-OptionalJsonField $choice 'message'
  if($null -eq $message){throw 'JREI_INFERENCE_RESPONSE_MISSING_MESSAGE'}
  $answer=[string](Get-OptionalJsonField $message 'content')
  $reasoning=[string](Get-OptionalJsonField $message 'reasoning_content')
  $finishReason=[string](Get-OptionalJsonField $choice 'finish_reason')
  $usage=Get-OptionalJsonField $reply 'usage'
  $outputTokens=Get-OptionalJsonField $usage 'completion_tokens'
  if($null -eq $outputTokens){$outputTokens='UNREPORTED'}
  $state=if([string]::IsNullOrWhiteSpace($answer)){'EMPTY'}else{'NONEMPTY'}
  Write-Output '[JREI] INFERENCE_HTTP_COMPLETED'
  Write-Output ('[JREI] OUTPUT_STATUS='+$state)
  Write-Output ('[JREI] FINISH_REASON='+$finishReason)
  Write-Output ('[JREI] OUTPUT_TOKENS='+[string]$outputTokens)
  $inputTokens=Get-OptionalJsonField $usage 'prompt_tokens'
  if($null -ne $inputTokens){
    Write-Output ('[JREI] PROMPT_TOKENS='+[string]$inputTokens)
  }
  Write-Output ('[JREI] REASONING_CHARACTERS='+$reasoning.Length)
  Write-Output ('[JREI] RESPONSE_LATENCY_MS='+$clock.ElapsedMilliseconds)
  if($state -eq 'NONEMPTY'){
    if($ThroughputProbe){
      # Full generated text stays in the process; log only token-count and
      # digest. Identical prompt, not identical model output, is guaranteed.
      $responseBytes=[Text.Encoding]::UTF8.GetBytes($answer.Trim())
      $sha=[Security.Cryptography.SHA256]::Create()
      try{
        $hex=[BitConverter]::ToString($sha.ComputeHash($responseBytes)).Replace('-','').ToLowerInvariant()
      }finally{$sha.Dispose()}
      Write-Output ('[JREI] SYNTHETIC_ANSWER_SHA256='+$hex)
      Write-Output ('[JREI] SYNTHETIC_ANSWER_CHARS='+$answer.Trim().Length)
    }else{
      Write-Output ('[JREI] SYNTHETIC_ANSWER='+$answer.Trim())
    }
  }else{
    Write-Output '[JREI] EMPTY_OUTPUT_NOT_AUTOMATICALLY_GPU_FAILURE'
  }
}catch{
  $message=[string]$_.Exception.Message
  if($message -cmatch '^JREI_[A-Z0-9_]+$'){Write-Output ('[JREI] LAB_ERROR='+$message)}
  else{
    Write-Output ('[JREI] LAB_ERROR_TYPE='+$_.Exception.GetType().Name)
    # Never print full exception text: it can contain private model paths.
    if($_.Exception -is [System.Management.Automation.PropertyNotFoundException]){
      Write-Output '[JREI] OPTIONAL_RESPONSE_FIELD_HANDLING_DIAGNOSTIC'
    }
  }
}finally{
  if($null -ne $lab){
    $lab.Refresh()
    if(-not $lab.HasExited){Stop-Process -Id $lab.Id -ErrorAction SilentlyContinue}
    Write-Output '[JREI] LAB_PROCESS_CLEANUP_REQUESTED'
  }
  Write-Output '[JREI] ORIGINAL_8081_AND_8091_UNTOUCHED'
  Write-Output '[JREI] HTTP_SUCCESS_IS_NOT_GPU_OFFLOAD_ATTESTATION'
  $logLines=@()
  if(Test-Path -LiteralPath $err -PathType Leaf){$logLines=@(Get-Content -LiteralPath $err -Tail 150 -ErrorAction SilentlyContinue)}
  $filtered=@($logLines | Where-Object {$_ -match 'offload|vulkan|gpu|ggml_vk|n_gpu_layers|memory|model loaded|error|invalid queue|eval time|buffer size|tokens per second'} | ForEach-Object {$_ -replace [regex]::Escape($env:USERPROFILE),'[USER]'})
  Write-Output '[JREI] RELEVANT_LOG_BEGIN'
  if($filtered.Count -gt 0){$filtered | Select-Object -Last 28}
  else{Write-Output '[JREI] NO_GPU_OFFLOAD_LOG_LINES_FOUND'}
  Write-Output '[JREI] RELEVANT_LOG_END'
}
