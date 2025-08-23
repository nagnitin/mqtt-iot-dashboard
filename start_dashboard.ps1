# MQTT IoT Dashboard - Windows PowerShell Startup Script
# Run as Administrator if needed

Write-Host "========================================" -ForegroundColor Green
Write-Host "MQTT IoT Dashboard - Windows Startup" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found. Please install Python 3.8+" -ForegroundColor Red
    exit 1
}

# Check if required packages are installed
Write-Host "Checking Python dependencies..." -ForegroundColor Yellow
try {
    python -c "import paho.mqtt.client; import flask; print('✓ All dependencies found')" 2>$null
    Write-Host "✓ All dependencies found" -ForegroundColor Green
} catch {
    Write-Host "✗ Missing dependencies. Installing..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

# Check if Mosquitto is running
Write-Host "Checking Mosquitto service..." -ForegroundColor Yellow
$mosquittoService = Get-Service -Name "mosquitto" -ErrorAction SilentlyContinue
if ($mosquittoService -and $mosquittoService.Status -eq "Running") {
    Write-Host "✓ Mosquitto service is running" -ForegroundColor Green
} else {
    Write-Host "⚠ Mosquitto service not found or not running" -ForegroundColor Yellow
    Write-Host "  Please install and start Mosquitto manually:" -ForegroundColor Yellow
    Write-Host "  choco install mosquitto" -ForegroundColor Cyan
    Write-Host "  mosquitto install" -ForegroundColor Cyan
    Write-Host "  mosquitto start" -ForegroundColor Cyan
}

# Check if port 5001 is available
$port5001 = Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue
if ($port5001) {
    Write-Host "⚠ Port 5001 is in use. Stopping existing process..." -ForegroundColor Yellow
    $process = Get-Process -Id $port5001.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $process.Id -Force
        Start-Sleep -Seconds 2
    }
}

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Yellow

# Start Python backend
Write-Host "Starting Python MQTT Backend..." -ForegroundColor Cyan
Start-Process -FilePath "cmd" -ArgumentList "/k", "cd backend && python mqtt_test.py" -WindowStyle Normal
Start-Sleep -Seconds 3

# Start Flask server
Write-Host "Starting Flask Web Server..." -ForegroundColor Cyan
Start-Process -FilePath "cmd" -ArgumentList "/k", "python app.py" -WindowStyle Normal
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Services Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Dashboard: http://localhost:5001" -ForegroundColor Cyan
Write-Host "MQTT Broker: localhost:1883" -ForegroundColor Cyan
Write-Host "WebSocket: localhost:9001" -ForegroundColor Cyan
Write-Host ""

# Wait a moment for services to start
Start-Sleep -Seconds 5

# Open dashboard in browser
Write-Host "Opening dashboard in browser..." -ForegroundColor Yellow
Start-Process "http://localhost:5001"

Write-Host ""
Write-Host "Dashboard opened in browser!" -ForegroundColor Green
Write-Host "Keep this window open to monitor services." -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Red

# Keep script running
try {
    while ($true) {
        Start-Sleep -Seconds 10
        # Check if services are still running
        $flaskProcess = Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object {$_.CommandLine -like "*app.py*"}
        if (-not $flaskProcess) {
            Write-Host "⚠ Flask server stopped unexpectedly" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host ""
    Write-Host "Stopping services..." -ForegroundColor Yellow
    Get-Process -Name "python" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "Services stopped." -ForegroundColor Green
} 