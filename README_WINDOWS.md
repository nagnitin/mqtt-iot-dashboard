# MQTT IoT Dashboard - Windows Setup Guide

This guide will help you set up the MQTT IoT Dashboard on Windows for integration with Arduino UNO R4.

## Prerequisites

### 1. Python Installation
- Download and install Python 3.8+ from [python.org](https://www.python.org/downloads/)
- Make sure to check "Add Python to PATH" during installation
- Verify installation: `python --version`

### 2. Git Installation
- Download and install Git from [git-scm.com](https://git-scm.com/download/win)
- Verify installation: `git --version`

### 3. Arduino IDE
- Download and install Arduino IDE from [arduino.cc](https://www.arduino.cc/en/software)
- Install required libraries:
  - WiFiS3 (for UNO R4 WiFi)
  - PubSubClient
  - Servo
  - MAX6675

## Setup Instructions

### 1. Clone the Repository
```cmd
git clone https://github.com/nagnitin/mqtt-iot-dashboard.git
cd mqtt-iot-dashboard
```

### 2. Install Python Dependencies
```cmd
pip install -r requirements.txt
```

### 3. Install MQTT Broker (Mosquitto)

#### Option A: Using Chocolatey (Recommended)
```cmd
# Install Chocolatey first if you don't have it
# Run PowerShell as Administrator and execute:
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Mosquitto
choco install mosquitto
```

#### Option B: Manual Installation
1. Download Mosquitto from [mosquitto.org](https://mosquitto.org/download/)
2. Extract to `C:\mosquitto`
3. Add `C:\mosquitto` to your PATH environment variable

### 4. Configure Mosquitto
Create `C:\mosquitto\mosquitto.conf`:
```conf
# MQTT Port
listener 1883
protocol mqtt

# WebSocket Port
listener 9001
protocol websockets

# Allow anonymous connections (for testing)
allow_anonymous true

# Log file
log_dest file
log_dest stdout
log_type all
log_timestamp true
log_file mosquitto.log
```

### 5. Start Mosquitto Broker
```cmd
# Start Mosquitto as a service (run as Administrator)
mosquitto install
mosquitto start

# Or run manually
mosquitto -c C:\mosquitto\mosquitto.conf
```

### 6. Run the Python Backend
```cmd
# In a new command prompt
cd backend
python mqtt_test.py
```

### 7. Run the Web Dashboard
```cmd
# In another command prompt
python app.py
```

### 8. Access the Dashboard
Open your browser and go to: `http://localhost:5001`

## Arduino UNO R4 Setup

### 1. Hardware Connections
```
Arduino UNO R4 WiFi Connections:
- Gas Sensor (MQ2): A0
- Flame Sensor: D2
- Temperature Sensor (MAX6675): 
  - CS: D10
  - SO: D12
  - SCK: D13
- Servo Motor: D9
```

### 2. Arduino Code Setup
1. Open `backend/arduino_end.ino` in Arduino IDE
2. Update these variables:
   ```cpp
   const char* ssid = "YOUR_WIFI_NAME";
   const char* password = "YOUR_WIFI_PASSWORD";
   const char* mqtt_server = "YOUR_WINDOWS_IP";  // e.g., "192.168.1.100"
   ```
3. Upload to Arduino UNO R4

### 3. Test Connection
- Check Arduino Serial Monitor for connection status
- Verify MQTT messages in the Python backend console
- Test dashboard controls

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```cmd
# Check what's using port 5001
netstat -ano | findstr :5001

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

#### 2. Mosquitto Won't Start
```cmd
# Check if Mosquitto is running
sc query mosquitto

# Restart Mosquitto service
net stop mosquitto
net start mosquitto
```

#### 3. Python Module Errors
```cmd
# Reinstall dependencies
pip uninstall -r requirements.txt
pip install -r requirements.txt
```

#### 4. Arduino Connection Issues
- Verify WiFi credentials
- Check MQTT server IP address
- Ensure Mosquitto is running on port 1883
- Check firewall settings

### Firewall Configuration
Windows Firewall may block MQTT connections. Add these rules:

```cmd
# Allow Mosquitto (run as Administrator)
netsh advfirewall firewall add rule name="Mosquitto MQTT" dir=in action=allow protocol=TCP localport=1883
netsh advfirewall firewall add rule name="Mosquitto WebSocket" dir=in action=allow protocol=TCP localport=9001
```

## Usage

### Dashboard Features
- **Dashboard Tab**: Live sensor data and charts
- **Servo Tab**: Manual servo control (0-140°)
- **Mode Tab**: Switch between Manual and Recipe modes
- **Recipe Tab**: Run predefined recipes or generate AI recipes
- **Connection Tab**: Configure MQTT connection settings

### MQTT Topics
- **Publish**: `mobile/angle`, `mobile/mode`, `mobile/recipe`
- **Subscribe**: `arduino/to/pi`, `arduino/alert`, `alert`

### AI Recipe Generator
1. Go to Recipe tab
2. Enter a prompt describing the servo sequence
3. Click "Generate" to create a recipe
4. Click "Apply & Run" to execute

## Development

### File Structure
```
mqtt-iot-dashboard/
├── app.py                 # Flask web server
├── requirements.txt       # Python dependencies
├── web/                   # Frontend files
│   ├── index.html        # Main dashboard
│   ├── app.js           # JavaScript logic
│   ├── styles.css       # Styling
│   └── libs/            # MQTT library
└── backend/              # Backend files
    ├── mqtt_test.py     # Python MQTT client
    └── arduino_end.ino  # Arduino firmware
```

### Running in Development Mode
```cmd
# Enable debug mode (already enabled by default)
python app.py
```

## Support

If you encounter issues:
1. Check the console output for error messages
2. Verify all services are running (Mosquitto, Python backend, Flask)
3. Test MQTT connectivity using a client like MQTT Explorer
4. Check Windows Event Viewer for service errors

## License

This project is licensed under the Apache License 2.0. 