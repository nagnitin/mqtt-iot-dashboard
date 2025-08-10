MQTT IoT Dashboard (Raspberry Pi + UNO R4)
=================================================

This project contains a browser-based dashboard (`web/`) and the backend code you provided (`backend/`) for a Raspberry Pi + Arduino UNO R4 WiFi setup.

Topics
------
- Publish
  - `mobile/angle` — angle value (0..140)
  - `mobile/mode` — 0 (manual) or 1 (recipe)
  - `mobile/recipe` — 1..3
- Subscribe
  - `arduino/to/pi` — JSON: `{ "gas": <int>, "flame": <0/1>, "temp": <float> }`
  - `arduino/alert` — human-readable alert text
  - `alert` — 0 (clear) or 1 (emergency)

Quick Start
-----------
1) Mosquitto with WebSockets on the Pi

Create `/etc/mosquitto/conf.d/websockets.conf`:

listener 1883
protocol mqtt

listener 9001
protocol websockets

allow_anonymous true

Restart mosquitto and verify.

2) Python backend on the Pi

python3 -m pip install paho-mqtt
python3 backend/mqtt_test.py

3) Arduino UNO R4 WiFi
- Open `backend/arduino_end.ino` in the Arduino IDE
- Set `mqtt_server` to your Pi IP
- Upload

4) Dashboard
- Open `web/index.html`
- Enter the Pi IP as Host, `9001` as WS Port
- Click Connect

Notes
-----
- The dashboard disables controls until connected or when `alert=1`.
- If CDN scripts are blocked, place `web/libs/mqttws31.min.js` locally and include it in `index.html`.

