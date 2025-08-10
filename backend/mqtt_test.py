import paho.mqtt.client as mqtt
import threading
import time
import os
import sys

# === Global variables ===
mode = 0
msg_from_R4 = ""
recipe = -1
manual_ang = 0
alert = 0

recipes = [
    {"angles": [140, 0, 90, 140], "delays": [10, 5, 10, 5]},
    {"angles": [0, 140, 90], "delays": [2, 20, 2]},
    {"angles": [90, 140, 90], "delays": [9, 5, 9]},
]


# === MQTT Callbacks ===
def on_connect(client, userdata, flags, rc):
    print(f"[MQTT] Connected with result code {rc}")
    client.subscribe("arduino/to/pi")
    client.subscribe("mobile/mode")
    client.subscribe("mobile/recipe")
    client.subscribe("mobile/angle")
    client.subscribe("mobile/recipe_json")
    client.subscribe("alert")


def on_message(client, userdata, msg):
    global msg_from_R4, mode, recipe, manual_ang, alert
    topic = msg.topic
    payload = msg.payload.decode()

    if topic == "arduino/to/pi":
        msg_from_R4 = payload
        print(f"[RECEIVED from Arduino] {payload}")

    elif topic == "mobile/mode":
        try:
            mode = int(payload)
            print(f"[RECEIVED from Mobile] MODE = {mode}")
        except ValueError:
            print(f"[ERROR] Invalid mode from mobile: {payload}")

    elif topic == "mobile/recipe":
        try:
            recipe = int(payload)
            print(f"[RECEIVED from Mobile] recipe = {recipe}")
        except ValueError:
            print(f"[ERROR] Invalid recipe from mobile: {payload}")

    elif topic == "mobile/recipe_json":
        try:
            data = json.loads(payload)
            slot = int(data.get("slot", 1))
            angles = list(map(float, data.get("angles", [])))
            delays = list(map(float, data.get("delays", [])))
            if slot < 1 or slot > len(recipes):
                print(f"[ERROR] recipe slot out of range: {slot}")
            elif len(angles) != len(delays) or len(angles) == 0:
                print("[ERROR] angles/delays mismatch or empty")
            else:
                recipes[slot - 1] = {"angles": angles, "delays": delays}
                print(f"[UPDATED] recipe {slot} -> {recipes[slot - 1]}")
        except Exception as e:
            print(f"[ERROR] Bad recipe_json: {e}; payload={payload}")

    elif topic == "mobile/angle":
        try:
            manual_ang = float(payload)
            print(f"[RECEIVED from Mobile] manual_ang = {manual_ang}")
        except ValueError:
            print(f"[ERROR] Invalid angle from mobile: {payload}")

    elif topic == "alert":
        try:
            alert = int(payload)
            if alert == 1:
                print(f"[ALERT from Arduino] Danger")
            else:
                print(f"[ALERT cleared]")
        except ValueError:
            print(f"[ERROR] Invalid alert value: {payload}")


# === MQTT Setup ===
client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message
client.connect("localhost", 1883, 60)


# === Thread 1: MQTT loop ===
def mqtt_loop():
    client.loop_forever()


# === Thread 2: Publish based on mode ===
def publish_to_arduino():
    global mode, recipe, manual_ang, alert
    while True:
        if mode == 1 and alert == 0:
            # Recipe numbers expected 1..len(recipes)
            if 1 <= recipe <= len(recipes):
                for angle, delay in zip(
                    recipes[recipe - 1]["angles"], recipes[recipe - 1]["delays"]
                ):
                    if mode == 1 and alert == 0:
                        message = f"{angle}"
                        print(f"[RECIPE {recipe} MODE] Publishing: {message}")
                        client.publish("pi/to/arduino", message)
                        client.publish("mobile/angle", message)
                        time.sleep(delay)
            # reset recipe so it doesn't loop endlessly
            recipe = -1
            client.publish("pi/to/arduino", "0")
            client.publish("mobile/angle", "0")

        elif mode == 0 and alert == 0:
            message = f"{manual_ang}"
            print(f"[MANUAL MODE] Publishing: {message}")
            client.publish("mobile/angle", message)
            client.publish("pi/to/arduino", message)

        elif alert == 1:
            print("[ALERT MODE] Not sending commands; resetting angle to 0")
            client.publish("mobile/angle", "0")
            # optional: restart script to clear any state
            print("Restarting script...")
            os.execv(sys.executable, ["python3"] + sys.argv)

        time.sleep(2)


# === Start threads ===
t1 = threading.Thread(target=mqtt_loop, daemon=True)
t2 = threading.Thread(target=publish_to_arduino, daemon=True)

t1.start()
t2.start()

t1.join()
t2.join()

