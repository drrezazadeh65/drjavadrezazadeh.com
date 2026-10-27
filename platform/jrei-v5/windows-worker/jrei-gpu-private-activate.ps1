#Requires -Version 5.1
<#
  JREI owner-only Radeon Vulkan inference: one-time install & persistent
  private GPU endpoint on loopback :8082. NEVER changes original :8081 Qwen
  or :8091 Python, public site, private auth flags, DNS, database, drivers,
  or the CPU fallback. The original 37/37 layer inference is owner-observed.
  This is NOT a scientific acceptance of Qwen language quality.
  Install makes an immutable local snapshot used by a limited owner task;
  later Git pulls cannot silently replace the approved running launcher.
#>
[CmdletBinding()]
param(
  [ValidateSet('Status','Install','Run','Remove')][string]$Mode='Status',
  [switch]$OwnerApproved
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if($env:OS -cne 'Windows_NT'){throw 'JREI_GPU_REQUIRES_WINDOWS'}
$root=Join-Path $env:LOCALAPPDATA 'JREI-GPU-Lab'
$folder=Join-Path $root 'llama-b11932-vulkan'
$zip=Join-Path $root 'llama-b11932-vulkan.zip'
$cfgPath=Join-Path $env:LOCALAPPDATA 'JREI\jrei-worker-config.json'
$approvedDir=Join-Path $root 'owner-approved'
$runScript=Join-Path $approvedDir 'jrei-gpu-private-activate.ps1'
$settings=Join-Path $approvedDir 'gpu-task.v1.json'
$taskName='JREI-GPU-Qwen-Private'
$alias='jrei-gpu-lab'
$expectedZip='64e4872836d633f496a46504f6fea407d1fdd4e84f6137df33cae513e3fbd13c'
$owner=[Security.Principal.WindowsIdentity]::GetCurrent().Name

function Log([string]$value){Write-Output ('[JREI] '+$value)}
function CheckConfig {
  if(-not (Test-Path -LiteralPath $cfgPath -PathType Leaf)){
    throw 'JREI_PRIVATE_CONFIG_MISSING'
  }
  $conf=Get-Content -LiteralPath $cfgPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if($conf.localChat.ownerApproved -ne $true -or
     $conf.localChat.rightsReviewed -ne $true -or
     $conf.localChat.enabled -eq $true){
    throw 'JREI_OWNER_RIGHTS_OR_PRIVATE_ONLY_GATE_FAILED'
  }
  $model=[string]$conf.localChat.modelFile
  $sha=[string]$conf.localChat.modelSha256
  if(-not [IO.Path]::IsPathRooted($model) -or
     -not (Test-Path -LiteralPath $model -PathType Leaf) -or
     $sha -cnotmatch '^[a-f0-9]{64}$' -or
     (Get-FileHash -LiteralPath $model -Algorithm SHA256).Hash.ToLowerInvariant() -cne $sha){
    throw 'JREI_OWNER_GGUF_INTEGRITY_FAILED'
  }
  return $model
}
function CheckBinary {
  if(-not (Test-Path -LiteralPath $zip -PathType Leaf) -or
     (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant() -cne $expectedZip){
    throw 'JREI_OFFICIAL_VULKAN_ZIP_INTEGRITY_FAILED'
  }
  $exes=@(Get-ChildItem -LiteralPath $folder -Recurse -Filter 'llama-server.exe' -File)
  if($exes.Count -ne 1){throw 'JREI_VULKAN_EXE_AMBIGUOUS'}
  return $exes[0].FullName
}
function CheckGpu([string]$exe){
  $lines=@(& $exe --list-devices 2>&1 | ForEach-Object {[string]$_})
  $valid=@($lines | Where-Object {
    $_ -match '^\s*Vulkan\d+: Radeon RX 580 Series \(\d+ MiB, \d+ MiB free\)'
  })
  if($valid.Count -ne 1){throw 'JREI_RX580_VULKAN_NOT_READY'}
  $m=[regex]::Match($valid[0],'\((\d+) MiB, (\d+) MiB free\)')
  if(-not $m.Success -or [int]$m.Groups[1].Value -lt 7168 -or
     [int]$m.Groups[2].Value -lt 5120){
    throw 'JREI_RX580_INSUFFICIENT_VRAM'
  }
}
function LoopbackReady {
  try {
    $models=Invoke-RestMethod -Uri 'http://127.0.0.1:8082/v1/models' -TimeoutSec 3
    return (@($models.data | Where-Object {$_.id -ceq $alias}).Count -gt 0)
  } catch {return $false}
}
function ActiveListener {
  return @(Get-NetTCPConnection -LocalPort 8082 -State Listen -ErrorAction SilentlyContinue)
}
function VerifiedLabProcess([int]$processId,[string]$exe){
  $p=Get-CimInstance Win32_Process -Filter "ProcessId=$processId" -ErrorAction SilentlyContinue
  if($null -eq $p){return $false}
  $cmd=[string]$p.CommandLine
  return ([string]$p.ExecutablePath).Equals($exe,[StringComparison]::OrdinalIgnoreCase) -and
    $cmd.Contains('--port 8082') -and $cmd.Contains('--alias jrei-gpu-lab')
}
function TaskState {
  return Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
}
if($Mode -eq 'Status'){
  $existing=TaskState
  Log ('GPU_TASK='+$(if($null -eq $existing){'NOT_REGISTERED'}else{$existing.State.ToString()}))
  Log ('GPU_LOOPBACK_8082='+$(if(LoopbackReady){'RESPONDING'}else{'NOT_RESPONDING'}))
  Log 'ORIGINAL_CPU_8081_AND_PYTHON_8091_NOT_MANAGED_HERE'
  return
}
if($Mode -eq 'Install'){
  if(-not $OwnerApproved){throw 'JREI_GPU_OWNER_APPROVAL_REQUIRED'}
  $null=CheckConfig
  $exe=CheckBinary
  CheckGpu $exe
  $present=TaskState
  if($null -ne $present){
    if(LoopbackReady){
      Log 'GPU_PRIVATE_ALREADY_RUNNING'
      return
    }
    if(@(ActiveListener).Count -ne 0){throw 'JREI_PORT_8082_UNVERIFIED_OCCUPANT'}
    Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
    Log 'GPU_EXISTING_TASK_START_REQUESTED'
  }else{
    if(@(ActiveListener).Count -ne 0){throw 'JREI_PORT_8082_ALREADY_USED'}
    if(Test-Path -LiteralPath $settings){throw 'JREI_EXISTING_OWNER_GPU_SETTINGS_REVIEW_REQUIRED'}
    $null=New-Item -ItemType Directory -Path $approvedDir -Force
    $source=[IO.Path]::GetFullPath($PSCommandPath)
    if($source.Equals([IO.Path]::GetFullPath($runScript),[StringComparison]::OrdinalIgnoreCase)){
      throw 'JREI_RUN_SNAPSHOT_NOT_INSTALL_SOURCE'
    }
    if(Test-Path -LiteralPath $runScript){throw 'JREI_EXISTING_GPU_SCRIPT_REVIEW_REQUIRED'}
    Copy-Item -LiteralPath $source -Destination $runScript -ErrorAction Stop
    $payload=@{
      schema='jr.jrei.gpu-private-owner-task.v1'
      owner=$owner
      installedAtUtc=[DateTime]::UtcNow.ToString('o')
      approvedScriptSha256=(Get-FileHash -LiteralPath $runScript -Algorithm SHA256).Hash.ToLowerInvariant()
      approvedExeSha256=(Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLowerInvariant()
      gpuLayers=37
      port=8082
      modelPubliclyApproved=$false
    }
    [IO.File]::WriteAllText($settings,($payload | ConvertTo-Json -Depth 4),
      [Text.UTF8Encoding]::new($false))
    try{
      $shell=(Get-Command powershell.exe -CommandType Application -ErrorAction Stop).Source
      $action=New-ScheduledTaskAction -Execute $shell -Argument (
        '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "'+$runScript+'" -Mode Run'
      ) -WorkingDirectory $approvedDir
      $trigger=New-ScheduledTaskTrigger -AtLogOn -User $owner
      $options=New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Seconds 0) -MultipleInstances IgnoreNew -StartWhenAvailable:$true -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
      $principal=New-ScheduledTaskPrincipal -UserId $owner -LogonType Interactive -RunLevel Limited
      Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $options -Principal $principal -Description 'JREI owner-private Vulkan Qwen on 127.0.0.1:8082; CPU fallback untouched' | Out-Null
      Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
      Log 'GPU_LIMITED_USER_TASK_INSTALLED_AND_STARTED'
    }catch{
      if($null -ne (TaskState)){
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
      }
      if(Test-Path -LiteralPath $settings){Remove-Item -LiteralPath $settings -Force}
      if(Test-Path -LiteralPath $runScript){Remove-Item -LiteralPath $runScript -Force}
      throw
    }
  }
  $ready=$false
  for($i=0;$i -lt 90;$i++){
    if(LoopbackReady){$ready=$true;break}
    Start-Sleep -Seconds 2
  }
  if($ready){
    Log 'GPU_PRIVATE_8082_RESPONDING'
  }else{
    Log 'GPU_TASK_REGISTERED_BUT_NO_HEALTH_RECEIPT'
  }
  Log 'PUBLIC_CHAT_STILL_DISABLED_AND_CPU_FALLBACK_UNCHANGED'
  return
}
if($Mode -eq 'Run'){
  if(-not (Test-Path -LiteralPath $settings -PathType Leaf)){
    throw 'JREI_PRIVATE_OWNER_GPU_TASK_SETTINGS_MISSING'
  }
  $approved=Get-Content -LiteralPath $settings -Raw -Encoding UTF8 | ConvertFrom-Json
  if($approved.schema -cne 'jr.jrei.gpu-private-owner-task.v1' -or
     $approved.owner -cne $owner -or $approved.gpuLayers -ne 37 -or
     $approved.port -ne 8082 -or $approved.modelPubliclyApproved -ne $false){
    throw 'JREI_PRIVATE_GPU_TASK_POLICY_CHANGED'
  }
  if((Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash.ToLowerInvariant() -cne
      [string]$approved.approvedScriptSha256){
    throw 'JREI_GPU_LAUNCHER_SNAPSHOT_CHANGED'
  }
  $model=CheckConfig
  $exe=CheckBinary
  if((Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLowerInvariant() -cne
      [string]$approved.approvedExeSha256){
    throw 'JREI_GPU_EXECUTABLE_CHANGED'
  }
  $mutex=[Threading.Mutex]::new($false,'Local\JREI-GPU-Qwen-Private-8082')
  $held=$false
  try{
    try{$held=$mutex.WaitOne(0)}
    catch [System.Threading.AbandonedMutexException]{$held=$true}
    if(-not $held){throw 'JREI_GPU_PRIVATE_ALREADY_RUNNING'}
    $failures=0
    while($true){
      if(@(ActiveListener).Count -gt 0){throw 'JREI_PRIVATE_GPU_PORT_OCCUPIED'}
      try{CheckGpu $exe}
      catch{
        Log 'GPU_HEADROOM_NOT_READY_RETRY_LATER'
        Start-Sleep -Seconds 60
        continue
      }
      $stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
      $stderr=Join-Path $root "private-gpu-$stamp-stderr.log"
      $stdout=Join-Path $root "private-gpu-$stamp-stdout.log"
      $args=@('--model',('"'+$model.Replace('"','')+'"'),
        '--alias',$alias,'--host','127.0.0.1','--port','8082',
        '--ctx-size','1024','--parallel','1','--threads','4',
        '--n-gpu-layers','37')
      $child=$null
      try{
        $child=Start-Process -FilePath $exe -ArgumentList $args -PassThru -RedirectStandardError $stderr -RedirectStandardOutput $stdout
        $started=[DateTime]::UtcNow
        $miss=0
        while($true){
          Start-Sleep -Seconds 10
          $child.Refresh()
          if($child.HasExited){break}
          if(LoopbackReady){$miss=0;$failures=0}else{$miss++}
          if($miss -ge 12){Log 'GPU_WATCHDOG_RESTART_REQUESTED';break}
        }
      }finally{
        if($null -ne $child){
          $child.Refresh()
          if(-not $child.HasExited){Stop-Process -Id $child.Id -Force -ErrorAction SilentlyContinue}
        }
      }
      $failures++
      Log 'GPU_WATCHDOG_BACKOFF_BEFORE_RESTART'
      Start-Sleep -Seconds ([Math]::Min(120,10*$failures))
    }
  }finally{
    if($held){$mutex.ReleaseMutex()}
    $mutex.Dispose()
  }
}
if($Mode -eq 'Remove'){
  if(-not $OwnerApproved){throw 'JREI_GPU_OWNER_APPROVAL_REQUIRED'}
  $current=TaskState
  if($null -ne $current){Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue}
  if(Test-Path -LiteralPath $settings -PathType Leaf){
    $manifest=Get-Content -LiteralPath $settings -Raw -Encoding UTF8 | ConvertFrom-Json
    if($manifest.owner -cne $owner){throw 'JREI_GPU_TASK_OWNER_MISMATCH'}
  }
  $backend=CheckBinary
  foreach($conn in (ActiveListener)){
    if(VerifiedLabProcess $conn.OwningProcess $backend){
      Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    }else{
      throw 'JREI_GPU_PORT_8082_PROCESS_UNVERIFIED_NOT_STOPPED'
    }
  }
  if($null -ne $current){
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
  }
  Log 'GPU_TASK_STOPPED_REMOVED_CPU_AND_PYTHON_UNCHANGED'
}
