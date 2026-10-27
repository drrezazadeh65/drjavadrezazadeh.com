#Requires -Version 5.1
<#
  JREI read-only AMD GPU readiness / actual local inference diagnostic.
  Does not install drivers, update a model, stop tasks, contact a network,
  train weights, change the JREI worker configuration or run inference.
  Windows WMI Win32_VideoController.AdapterRAM may wrap at 4 GiB;
  use Windows Task Manager "Dedicated GPU memory" as the VRAM authority.
  Backend GPU support requires a separately isolated live benchmark.
#>
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if($env:OS -cne 'Windows_NT'){throw 'JREI_GPU_WINDOWS_ONLY'}
$privateConfig=Join-Path $env:LOCALAPPDATA 'JREI\jrei-worker-config.json'
$reported=[ordered]@{
  schema='jr.jrei.amd-vulkan-readonly-check.v1'
  checkedAtUtc=[DateTime]::UtcNow.ToString('o')
  ownerConfigPresent=$false
  amdDisplayAdapterObserved=$false
  videoAdapterName=$null
  adapterRamFromCimAuthoritative=$false
  dedicatedVramMeasuredByThisCheck=$false
  taskManagerDedicatedVramNeeded=$true
  vulkanSystemLoaderPresent=$false
  verifiedBackendBinaryPresent=$false
  backendVulkanLibraryPresent=$false
  activeLocalInferenceProcesses=0
  activeProcessExplicitCpuOnly=$false
  activeProcessExplicitGpuLayers=$false
  originalLauncherCpuOnly=$true
  modelQualityIndependentlyAccepted=$false
  actualGpuOffloadIndependentlyVerified=$false
  safeToAutoEnableGpu=$false
  existingPublicModelChanged=$false
}
try{
  $gpus=@(Get-CimInstance Win32_VideoController -ErrorAction Stop |
    Where-Object { $_.Name -match 'AMD|Radeon' })
  if($gpus.Count -gt 0){
    $reported.amdDisplayAdapterObserved=$true
    $reported.videoAdapterName=[string]$gpus[0].Name
  }
}catch{}
# An installed Vulkan loader alone does not prove the EXE has a compatible
# ggml-vulkan backend, correct 8 GB dedicated VRAM, or functional offload.
$loader=Join-Path $env:WINDIR 'System32\vulkan-1.dll'
$reported.vulkanSystemLoaderPresent=Test-Path -LiteralPath $loader -PathType Leaf
if(Test-Path -LiteralPath $privateConfig -PathType Leaf){
  $reported.ownerConfigPresent=$true
  try{
    $cfg=Get-Content -LiteralPath $privateConfig -Raw -Encoding UTF8 |
      ConvertFrom-Json
    $exe=[string]$cfg.localChat.backendExe
    if([IO.Path]::IsPathRooted($exe) -and
       [IO.Path]::GetFileName($exe) -ieq 'llama-server.exe' -and
       (Test-Path -LiteralPath $exe -PathType Leaf)){
      # Hash-pinning is checked in original owner model-start code. This
      # read-only check cannot certify SHA unless config's SHA is present.
      $expected=[string]$cfg.localChat.backendExeSha256
      if($expected -cmatch '^[a-f0-9]{64}$'){
        $actual=(Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash
        $reported.verifiedBackendBinaryPresent=($actual -ieq $expected)
      }
      $folder=Split-Path -Path $exe -Parent
      $candidate=Join-Path $folder 'ggml-vulkan.dll'
      $reported.backendVulkanLibraryPresent=Test-Path -LiteralPath $candidate -PathType Leaf
    }
  }catch{}
}
try{
  $procs=@(Get-CimInstance Win32_Process -Filter "Name='llama-server.exe'" -ErrorAction Stop)
  $reported.activeLocalInferenceProcesses=$procs.Count
  foreach($proc in $procs){
    # Never print process command line: it includes local model paths.
    $cmd=[string]$proc.CommandLine
    if($cmd -match '(?:^|\s)--n-gpu-layers\s+0(?:\s|$)'){
      $reported.activeProcessExplicitCpuOnly=$true
    }
    if($cmd -match '(?:^|\s)--n-gpu-layers\s+[1-9][0-9]*(?:\s|$)'){
      $reported.activeProcessExplicitGpuLayers=$true
    }
  }
}catch{}
# Even a positive --n-gpu-layers value does not prove real GPU allocation.
# Never promote capacity policy from command-line metadata alone.
$reported | ConvertTo-Json -Depth 3
