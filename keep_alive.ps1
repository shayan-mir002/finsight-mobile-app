param(
  [string]$Url = "https://finsight-app-6b7ac.containers.snapdeploy.app/health"
)

$log = Join-Path $PSScriptRoot "keep_alive.log"

try {
  $r = Invoke-WebRequest -Uri $Url -TimeoutSec 60 -UseBasicParsing
  Add-Content -Path $log -Value ("{0} HTTP {1} {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $r.StatusCode, $r.Content)
} catch {
  Add-Content -Path $log -Value ("{0} FAIL {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $_.Exception.Message)
  exit 1
}
