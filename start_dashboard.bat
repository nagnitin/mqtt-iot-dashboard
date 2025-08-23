@echo off
echo ========================================
echo MQTT IoT Dashboard - Windows Startup
echo ========================================
echo.

echo Starting Mosquitto MQTT Broker...
echo (Make sure Mosquitto is installed and configured)
echo.

echo Starting Python Backend...
start "MQTT Backend" cmd /k "cd backend && python mqtt_test.py"
timeout /t 3 /nobreak >nul

echo Starting Flask Web Server...
start "Flask Server" cmd /k "python app.py"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo Services Started!
echo ========================================
echo.
echo Dashboard: http://localhost:5001
echo MQTT Broker: localhost:1883
echo WebSocket: localhost:9001
echo.
echo Press any key to open dashboard in browser...
pause >nul

start http://localhost:5001

echo.
echo Dashboard opened in browser!
echo Keep this window open to monitor services.
echo.
pause 