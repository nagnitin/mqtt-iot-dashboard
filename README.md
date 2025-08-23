MQTT IoT Dashboard (Raspberry Pi + UNO R4)
=================================================

Modern web dashboard (web/) + Python service (backend/mqtt_test.py) + Arduino UNO R4 sketch (backend/arduino_end.ino) connected through Mosquitto MQTT on a Raspberry Pi.

What you get
- Servo control (manual + recipe)
- Mode toggle with timestamps
- Live charts: gas and temperature
- Alerts feed from Arduino
- AI Recipe Generator (Gemini) that can update recipes on the fly

Prerequisites
- Raspberry Pi with Mosquitto broker (or Windows with Mosquitto)
- Arduino UNO R4 WiFi
- Browser with internet (for CDN); or host mqttws31 locally

**For Windows users**: See [README_WINDOWS.md](README_WINDOWS.md) for detailed Windows setup instructions.

1) Enable WebSockets on the Pi (Mosquitto)
Create `/etc/mosquitto/conf.d/websockets.conf`:

listener 1883
protocol mqtt

listener 9001
protocol websockets

allow_anonymous true  # testing only; secure later

Then restart Mosquitto:
sudo systemctl restart mosquitto && sudo systemctl status mosquitto

2) Run the Python backend (on the Pi)
python3 -m pip install paho-mqtt
python3 backend/mqtt_test.py

3) Flash the Arduino (UNO R4 WiFi)
- Open `backend/arduino_end.ino` in Arduino IDE
- Set `ssid`, `password`, and `mqtt_server` to your network/Pi IP
- Install libraries: WiFiS3, PubSubClient, Servo, MAX6675
- Upload

4) Run the Flask Web Server (Optional)
- Install dependencies: `pip install -r requirements.txt`
- Run the server: `python app.py`
- Access dashboard at: `http://localhost:5001`

5) Open the Dashboard
- Option A: Use Flask server (recommended)
  - Open `http://localhost:5001` in a browser
- Option B: Direct file access
  - Open `web/index.html` in a browser
- Host: your Pi IP (e.g., 192.168.1.50)
- WS Port: 9001
- Click Connect

Use the Website
---------------
- Dashboard
  - View live servo mirror, mode status, alerts, and charts.
  - Alerts list aggregates messages from `arduino/alert`/`alert`.
- Servo tab
  - Drag the slider and click "Send" to publish to `mobile/angle`.
  - Toggle "Live publish while dragging" to stream values while moving the slider.
- Mode tab
  - Off (0) = Manual mode (servo uses slider value).
  - On (1) = Recipe mode (runs the selected recipe sequence).
- Recipe tab
  - Choose recipe 1/2/3 and click "Send" (`mobile/recipe`).
  - AI Recipe Generator: paste your Gemini API key, write a prompt, click Generate. Review JSON, then "Apply & Run" to publish `mobile/recipe_json` and switch to recipe mode.
  - UI auto-locks when `alert=1` and unlocks on `alert=0`.

Using the UI
- Servo tab: move slider and Send (or enable Live)
- Mode tab: Off = Manual; On = Recipe
- Recipe tab: choose 1/2/3; Send to run
- AI Recipe Generator: enter prompt, Generate → Apply & Run (publishes to `mobile/recipe_json`)

Topics
- Publish: `mobile/angle`, `mobile/mode`, `mobile/recipe`, `mobile/recipe_json`
- Subscribe: `arduino/to/pi` (JSON), `arduino/alert`, `alert`, `mobile/angle`

Troubleshooting
- If Paho script is blocked by your network/CDN:
  - Download mqttws31.min.js and place at `web/libs/mqttws31.min.js`
  - Include it before `app.js` in `index.html`
- If VS Code shows include errors for Arduino headers:
  - We ship `.vscode/` with proper settings; ensure Arduino + C/C++ extensions are installed
- If UNO can’t connect:
  - Verify `mqtt_server` matches the Pi IP and both devices share the network

Security
- The web UI does not store your Gemini key in the repo. Paste your key into the Recipe page field when needed; it is saved only in your browser’s localStorage.

License
-------
This project is licensed under the Apache License 2.0. See `LICENSE` for details.

