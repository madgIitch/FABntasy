param([Parameter(Mandatory=$true)][string]$ProjectId)
$ErrorActionPreference = 'Stop'
if (-not (Get-Command railway -ErrorAction SilentlyContinue)) { throw 'Railway CLI is required' }
$config = Get-Content "$PSScriptRoot/../../infrastructure/railway/service-config.json" -Raw | ConvertFrom-Json
railway link --project $ProjectId
railway service create fab-ingestor
railway environment edit --service-config fab-ingestor source.rootDirectory /services/fab_ingestor
railway volume add --mount-path $config.volume.mountPath
Write-Output 'Set Config as Code path to /infrastructure/railway/railway.toml in Railway.'
Write-Output 'Set region/CPU/RAM, volume size and notification destinations in Railway; verify with verify-deployment.ps1.'
Write-Output 'Secrets are deliberately not accepted by this script. Set them in the provider secret store.'
