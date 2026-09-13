param([Parameter(Mandatory=$true)][string]$ImageRef)
$ErrorActionPreference = 'Stop'
if ($ImageRef -notmatch '@sha256:[0-9a-f]{64}$') { throw 'Deployment must use an immutable sha256 digest' }
$config = Get-Content "$PSScriptRoot/../../infrastructure/railway/service-config.json" -Raw | ConvertFrom-Json
if ($config.replicas -ne 1 -or $config.scaleToZero -ne $false -or $config.restart.maxRetries -ne 5) { throw 'Unsafe production topology' }
if ($config.volume.mountPath -ne '/var/lib/canastio' -or $config.volume.sizeGiB -ne 1) { throw 'Persistent credential volume mismatch' }
Write-Output "deployment contract valid: $ImageRef"
