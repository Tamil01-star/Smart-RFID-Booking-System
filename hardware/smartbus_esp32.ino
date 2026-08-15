#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h>

// --- Configuration ---
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Vercel API Endpoint (Replace with your actual Vercel Domain)
// e.g., https://smart-rfid-booking-system.vercel.app/api/hardware/scan
const char* api_url = "https://YOUR_VERCEL_APP_URL/api/hardware/scan";

const int BUS_ID = 1; // ID of the bus this ESP32 is installed in

// --- Pin Definitions ---
// RFID MFRC522
#define RST_PIN  22
#define SS_PIN   5
MFRC522 mfrc522(SS_PIN, RST_PIN);

// LCD 16x2 I2C
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Output Pins
#define GREEN_LED 2
#define RED_LED 4
#define BUZZER 15

void setup() {
  Serial.begin(115200);

  // Initialize Pins
  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(BUZZER, OUTPUT);
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED, LOW);
  digitalWrite(BUZZER, LOW);

  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.print("SMARTBUS+");
  lcd.setCursor(0, 1);
  lcd.print("Connecting WiFi");

  // Connect WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
  
  // Initialize RFID
  SPI.begin();
  mfrc522.PCD_Init();
  Serial.println("RFID Ready.");

  lcd.clear();
  lcd.print("SMARTBUS+ Ready");
  lcd.setCursor(0, 1);
  lcd.print("Tap RFID Card...");
}

void loop() {
  // Look for new RFID cards
  if (!mfrc522.PICC_IsNewCardPresent()) return;
  if (!mfrc522.PICC_ReadCardSerial()) return;

  // Get UID String (e.g. A1B2C3D4)
  String uid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    uid += String(mfrc522.uid.uidByte[i] < 0x10 ? "0" : "");
    uid += String(mfrc522.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  
  Serial.println("Card Detected: " + uid);
  
  // Halt PICC
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();

  lcd.clear();
  lcd.print("Processing...");
  
  // Send to Vercel API
  processFare(uid);
  
  delay(3000); // Wait before accepting next tap
  
  lcd.clear();
  lcd.print("SMARTBUS+ Ready");
  lcd.setCursor(0, 1);
  lcd.print("Tap RFID Card...");
}

void processFare(String uid) {
  if (WiFi.status() != WL_CONNECTED) {
    showError("No WiFi");
    return;
  }

  HTTPClient http;
  http.begin(api_url);
  http.addHeader("Content-Type", "application/json");

  // Create JSON Payload
  StaticJsonDocument<200> doc;
  doc["uid"] = uid;
  doc["bus_id"] = BUS_ID;
  String jsonBody;
  serializeJson(doc, jsonBody);

  // Send POST Request
  int httpResponseCode = http.POST(jsonBody);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println(httpResponseCode);
    Serial.println(response);

    StaticJsonDocument<500> responseDoc;
    deserializeJson(responseDoc, response);

    bool success = responseDoc["success"];
    String message = responseDoc["message"];

    if (success) {
      float balance = responseDoc["newBalance"];
      showSuccess(message, balance);
    } else {
      showError(message);
    }
  } else {
    Serial.print("Error code: ");
    Serial.println(httpResponseCode);
    showError("Server Error");
  }

  http.end();
}

void showSuccess(String message, float balance) {
  // Beep once
  digitalWrite(BUZZER, HIGH);
  delay(200);
  digitalWrite(BUZZER, LOW);
  
  // Green LED
  digitalWrite(GREEN_LED, HIGH);

  // Update LCD
  lcd.clear();
  lcd.print("SUCCESS!");
  lcd.setCursor(0, 1);
  lcd.print("Bal: Rs. " + String(balance, 2));

  delay(2000);
  digitalWrite(GREEN_LED, LOW);
}

void showError(String errorMsg) {
  // Beep three times
  for (int i=0; i<3; i++) {
    digitalWrite(BUZZER, HIGH);
    delay(150);
    digitalWrite(BUZZER, LOW);
    delay(100);
  }
  
  // Red LED
  digitalWrite(RED_LED, HIGH);

  // Update LCD
  lcd.clear();
  lcd.print("ACCESS DENIED");
  lcd.setCursor(0, 1);
  lcd.print(errorMsg.substring(0, 16));

  delay(2000);
  digitalWrite(RED_LED, LOW);
}
