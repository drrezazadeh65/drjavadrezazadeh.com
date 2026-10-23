<#
  JREI Windows 11 key protection. The local owner's Windows DPAPI binds the
  key to their CURRENT user context. No key is sent to Bertina or GitHub.
  The only operations are fixed encrypt/decrypt; no remote instructions.
  Node launches this exact audited file, never a model-provided command.
#>
param(
  [Parameter(Mandatory=$true)][ValidateSet('protect','unprotect')]
  [string]$Mode,
  [Parameter(Mandatory=$true)][string]$KeyFile
)
$ErrorActionPreference = 'Stop'
if (-not [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform(
  [System.Runtime.InteropServices.OSPlatform]::Windows)) {
  throw 'Windows DPAPI requires Windows.'
}
if ($Mode -eq 'protect') {
  $plain = [Console]::In.ReadToEnd()
  if ([string]::IsNullOrWhiteSpace($plain) -or $plain.Length -gt 8192) {
    throw 'Invalid key input.'
  }
  $secure = ConvertTo-SecureString -String $plain -AsPlainText -Force
  $encrypted = ConvertFrom-SecureString -SecureString $secure
  $target = [IO.Path]::GetFullPath($KeyFile)
  $parent = [IO.Path]::GetDirectoryName($target)
  if (-not [IO.Directory]::Exists($parent)) { throw 'Private storage missing.' }
  [IO.File]::WriteAllText($target,$encrypted,[Text.Encoding]::ASCII)
  # Restrict access beyond DPAPI binding: inherited ACL should not grant
  # shared user accounts access to encrypted private-key material.
  $acl = Get-Acl -LiteralPath $target
  $acl.SetAccessRuleProtection($true,$false)
  $user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
  $rule = New-Object Security.AccessControl.FileSystemAccessRule(
    $user,'FullControl','Allow')
  $acl.SetAccessRule($rule)
  Set-Acl -LiteralPath $target -AclObject $acl
  exit 0
}
if (-not [IO.File]::Exists($KeyFile)) { throw 'Encrypted key missing.' }
$cipher = [IO.File]::ReadAllText($KeyFile,[Text.Encoding]::ASCII)
$secret = ConvertTo-SecureString -String $cipher
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  [Console]::Out.Write($plain)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}
