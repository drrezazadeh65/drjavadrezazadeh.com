/**
 * Owner-local Windows RAM evidence: OS-reported PeakWorkingSet64 for exactly
 * the pinned llama-server.exe executable. No downloads, passwords, logs,
 * file changes, remote calls, process starts or arbitrary owner commands.
 *
 * A process lifetime peak is not physical total RAM, GPU VRAM, or an
 * independent performance acceptance. Null = unavailable, never fabricate.
 */
import {execFileSync} from 'node:child_process';
import {isAbsolute,extname} from 'node:path';

const script=String.raw`
$ErrorActionPreference = 'Stop'
$expected = $env:JREI_PINNED_LLAMA_EXE
if ([string]::IsNullOrWhiteSpace($expected)) { exit 3 }
$target = [IO.Path]::GetFullPath($expected)
$found = @(
  Get-CimInstance Win32_Process -Filter "Name = 'llama-server.exe'" |
  Where-Object {
    $_.ExecutablePath -and
    [string]::Equals([IO.Path]::GetFullPath($_.ExecutablePath),
      $target,[StringComparison]::OrdinalIgnoreCase)
  }
)
if ($found.Count -ne 1) { exit 4 }
$p = [System.Diagnostics.Process]::GetProcessById([int]$found[0].ProcessId)
[Console]::Out.Write([string]$p.PeakWorkingSet64)
`;

export function parsePeakWorkingSetBytes(text){
  if(typeof text!=='string'||!/^[0-9]{5,16}$/.test(text.trim()))
    return null;
  const n=Number(text.trim());
  if(!Number.isSafeInteger(n)||n<64*1024*1024||n>1024*1024*1024*1024)
    return null;
  return Math.ceil(n/1048576);
}

export function readPinnedWindowsPeakWorkingSetMb(backendExe){
  if(process.platform!=='win32'||typeof backendExe!=='string'||
     !isAbsolute(backendExe)||extname(backendExe).toLowerCase()!=='.exe')
    return null;
  try{
    const text=execFileSync('powershell.exe',[
      '-NoLogo','-NoProfile','-NonInteractive','-Command',script
    ],{
      encoding:'utf8',windowsHide:true,timeout:8000,maxBuffer:1024,
      env:{...process.env,JREI_PINNED_LLAMA_EXE:backendExe},
      stdio:['ignore','pipe','ignore']
    });
    return parsePeakWorkingSetBytes(text);
  }catch{return null;}
}
