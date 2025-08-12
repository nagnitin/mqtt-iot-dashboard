#include <WiFiS3.h>
#include <PubSubClient.h>
#include <Servo.h>
#include <max6675.h>
#if defined(ARDUINO_ARCH_AVR)
#include <avr/wdt.h>
#elif defined(ARDUINO_ARCH_RENESAS)
// Some cores don't expose a cmsis.h include path; forward-declare the symbol
extern "C" void NVIC_SystemReset(void);
#endif

const char* ssid = "Neo_Mallena_7";
const char* password = "947606139";
const char* mqtt_server = "10.211.141.246"; // IP of Raspberry Pi

Servo myServo;
String msg_from_pi5 = "";

#define SERVO_PIN 9
#define FLAME_PIN 3
#define BUZZER_PIN 4
#define MQ2_PIN A0

// Thermocouple pins
int thermoSO = 8;
int thermoCS = 6;
int thermoSCK = 7;
MAX6675 thermocouple(thermoSCK, thermoCS, thermoSO);

int alert = 0;
int currentAngle = 0;
bool emergency = false;
unsigned long lastBuzz = 0;

WiFiClient wifiClient;
PubSubClient client(wifiClient);

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    if (client.connect("ArduinoClient")) {
      Serial.println("connected");
      client.subscribe("pi/to/arduino");
      client.subscribe("mobile/angle");
      client.subscribe("alert");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      delay(500);
    }
  }
}

void moveServo(int target) {
  if (target == currentAngle) return;
  int step = (target > currentAngle) ? 1 : -1;
  for (int pos = currentAngle; pos != target; pos += step) {
    myServo.write(pos);
    delay(10);
  }
  currentAngle = target;
}

void buzzPattern() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(100);
    digitalWrite(BUZZER_PIN, LOW);
    delay(100);
  }
}

static void softResetBoard() {
#if defined(ARDUINO_ARCH_AVR)
  wdt_enable(WDTO_15MS);
  while (true) {}
#elif defined(ARDUINO_ARCH_RENESAS)
  NVIC_SystemReset();
#elif defined(ESP8266) || defined(ESP32)
  ESP.restart();
#else
  void (*resetFunc)(void) = 0;
  resetFunc();
#endif
}

void emergencyShutdown() {
  client.publish("arduino/alert", "Flame Detected – Resetting");
  delay(100);
  softResetBoard();
}

void checkEmergency(bool flameDetected) {
  if (flameDetected) {
    emergency = true;
    client.publish("arduino/alert", "Flame Detected!");
    client.publish("alert", "1");
    moveServo(0);
    buzzPattern();
    lastBuzz = millis();
    while (true) {
      moveServo(0);
    }
  } else {
    emergency = false;
    client.publish("arduino/alert", "Clear");
    digitalWrite(BUZZER_PIN, LOW);
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("]: ");

  msg_from_pi5 = "";
  for (unsigned int i = 0; i < length; i++) {
    msg_from_pi5 += (char)payload[i];
    Serial.print((char)payload[i]);
  }
  Serial.println();
  moveServo(msg_from_pi5.toInt());
  currentAngle = msg_from_pi5.toInt();
}

void setup() {
  myServo.attach(SERVO_PIN);
  delay(100);
  moveServo(90);
  currentAngle = 0;

  pinMode(FLAME_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    moveServo(0);
    delay(500);
    Serial.print(".");
  }
  moveServo(0);
  Serial.println("WiFi connected");
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);

  client.publish("alert", "0");
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  float temp = thermocouple.readCelsius();
  bool flame = digitalRead(FLAME_PIN);
  int gasValue = analogRead(MQ2_PIN);

  checkEmergency(!flame);

  static unsigned long lastMsg = 0;
  if (millis() - lastMsg > 5000) {
    lastMsg = millis();
    String msg = "{\"gas\":" + String(gasValue) + ",\"flame\":" + String(!flame) + ",\"temp\":" + String(temp) + "}";
    client.publish("arduino/to/pi", msg.c_str());
  }
}

