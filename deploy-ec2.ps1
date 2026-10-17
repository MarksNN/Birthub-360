param(
    [string]$KeyPath = $(if (Test-Path "$env:USERPROFILE\.ssh\Birthub360.pem") { "$env:USERPROFILE\.ssh\Birthub360.pem" } else { "C:\Users\marce\OneDrive\Documentos\CHAVE AWS BIRTHUB 360.pem" }),
    [string]$EC2Host = "3.143.251.44",
    [string]$EC2User = "ubuntu"
)

$ErrorActionPreference = "Stop"

Write-Host "Deploy to AWS EC2: $EC2Host" -ForegroundColor Cyan
Write-Host "SSH Key: $KeyPath" -ForegroundColor Cyan

if (-not (Test-Path $KeyPath)) {
    Write-Host "Error: SSH key not found at $KeyPath" -ForegroundColor Red
    exit 1
}

Write-Host "Building locally..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed" -ForegroundColor Red
    exit 1
}

Write-Host "Copying files to EC2..." -ForegroundColor Yellow
scp -i $KeyPath -r dist "$($EC2User)@$($EC2Host):/home/ubuntu/birthhub-360/dist-new"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to copy dist" -ForegroundColor Red
    exit 1
}

Write-Host "Updating application on server..." -ForegroundColor Yellow
$remoteCommands = @'
cd /home/ubuntu/birthhub-360 && if [ -d dist ]; then mv dist dist-backup-$(date +%Y%m%d-%H%M%S); fi && mv dist-new dist && docker restart birthhub-app && docker ps | grep birthhub-app
'@

ssh -i $KeyPath "$($EC2User)@$($EC2Host)" $remoteCommands

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to update server" -ForegroundColor Red
    exit 1
}

Write-Host "Deploy completed!" -ForegroundColor Green
Write-Host "Access: http://$EC2Host" -ForegroundColor Cyan
