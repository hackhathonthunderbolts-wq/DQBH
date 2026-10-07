$sourceDir = "C:\Users\HarshithVenkataraman\.gemini\antigravity\scratch\dqbh-platform"
$parentDir = "C:\Users\HarshithVenkataraman\.gemini\antigravity\scratch"
$zipTarget = Join-Path $parentDir "dqbh-platform.zip"
$localZipTarget = Join-Path $sourceDir "dqbh-platform.zip"

Write-Host "Packaging DQBH Industrial Platform Full-Stack Scaffold..."

if (Test-Path $zipTarget) { Remove-Item -Force $zipTarget }
if (Test-Path $localZipTarget) { Remove-Item -Force $localZipTarget }

$files = Get-ChildItem -Path $sourceDir -Recurse | Where-Object { $_.FullName -notmatch "node_modules|\.git|dqbh-platform\.zip" }

Compress-Archive -Path $sourceDir -DestinationPath $zipTarget -CompressionLevel Optimal -Force
Copy-Item -Path $zipTarget -Destination $localZipTarget -Force

Write-Host "Archive created at $zipTarget and $localZipTarget"
