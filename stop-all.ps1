# Stop all services script
Write-Host "🛑 Stopping all Driver Sentiment Engine services..." -ForegroundColor Yellow

# Stop Docker containers
Write-Host "`n📦 Stopping Docker containers..." -ForegroundColor Cyan
docker-compose down

Write-Host "`n✅ All services stopped!" -ForegroundColor Green
Write-Host "You can close all terminal windows now." -ForegroundColor Gray
