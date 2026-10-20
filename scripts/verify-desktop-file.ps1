$Desktop = [Environment]::GetFolderPath('Desktop')
$Output = Join-Path $Desktop 'BIRTHUB360_AUDITORIA_REAL_COMPLETA.html'
Write-Output "Test-Path: $(Test-Path $Output)"
Get-Item $Output | Select-Object FullName, Length, LastWriteTime
