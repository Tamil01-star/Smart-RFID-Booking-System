#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Keypad.h>

// ==========================================
// PIN DEFINITIONS
// ==========================================
#define SS_PIN    5
#define RST_PIN   17
#define GREEN_LED 4
#define RED_LED   2
#define BUZZER    15

// Keypad Configuration
const byte ROWS = 4; 
const byte COLS = 4; 
char keys[ROWS][COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};
byte rowPins[ROWS] = {13, 12, 14, 27};
byte colPins[COLS] = {26, 25, 33, 32};

// ==========================================
// OBJECT INITIALIZATION
// ==========================================
LiquidCrystal_I2C lcd(0x27, 16, 2); 
MFRC522 rfid(SS_PIN, RST_PIN);
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

// ==========================================
// STATE MACHINE CONFIGURATION
// ==========================================
enum SystemState {
  STATE_STANDBY,
  STATE_RFID_SCANNED_NO_BOOKING,
  STATE_WALKIN_PROMPT,
  STATE_BOARDING_LOC,
  STATE_DEST_MENU,
  STATE_SELECTED_CONFIRM,
  STATE_FARE_DISPLAY,
  STATE_CHECKING_WALLET,
  STATE_ALLOCATING_SEAT,
  STATE_SUCCESS,
  STATE_LOW_BALANCE,
  STATE_CANCELLED,
  STATE_TIMEOUT
};

SystemState currentState = STATE_STANDBY;
bool stateJustChanged = true;
unsigned long stateStartTime = 0;

// Walk-in Booking Variables
int currentDestIndex = 0; 
const int NUM_DESTINATIONS = 4;
String destinations[NUM_DESTINATIONS] = {"1.Tiruchengode", "2.Erode", "3.Tiruppur", "4.Coimbatore"};
String shortNames[NUM_DESTINATIONS] = {"Tiruchengode", "Erode", "Tiruppur", "Coimbatore"};
int fares[NUM_DESTINATIONS] = {15, 30, 42, 57}; // Demo: Student 50% fares from PDF

int simulatedWalletBalance = 150; // Try changing to 20 to test Low Balance path

#include <WiFi.h>

// WiFi Credentials
const char* ssid = "ZENKAI_MONARCH";
const char* password = "********";

// ==========================================
// SETUP & INITIALIZATION
// ==========================================
void setup() {
  Serial.begin(115200);
  
  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(BUZZER, OUTPUT);
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED, LOW);
  digitalWrite(BUZZER, LOW);
  
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Smart Bus System");
  lcd.setCursor(0, 1);
  lcd.print("Connecting WiFi.");
  
  // Connect to WiFi
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);
  WiFi.begin(ssid, password);
  
  Serial.print("Connecting to WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) { // 10 second timeout
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  lcd.clear();
  lcd.setCursor(0, 0);
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    lcd.print("WiFi Connected!");
  } else {
    Serial.println("\nWiFi Failed!");
    lcd.print("WiFi Failed!");
  }
  
  delay(1500);
  
  SPI.begin();
  rfid.PCD_Init();
  
  delay(1000);
  changeState(STATE_STANDBY);
}

// ==========================================
// MAIN LOOP
// ==========================================
void loop() {
  char key = keypad.getKey();
  
  // Print ANY key pressed to the Serial Monitor for debugging
  if (key) {
    Serial.print("Keypad Pressed: ");
    Serial.println(key);
  }

  unsigned long currentTime = millis();
  unsigned long elapsedTime = currentTime - stateStartTime;

  switch(currentState) {
    // ----------------------------------------------------
    case STATE_STANDBY:
      if (stateJustChanged) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("SmartBus Ready");
        lcd.setCursor(0, 1);
        lcd.print("Tap RFID to Board");
        Serial.println("Entered STATE_STANDBY. Waiting for RFID or Keypad...");
        stateJustChanged = false;
      }
      
      // Allow user to bypass RFID by just pressing 'A' from standby
      if (key == 'A') {
         Serial.println("Manual override: 'A' pressed in standby.");
         changeState(STATE_WALKIN_PROMPT);
      }
      
      // Simulate RFID tap for Walk-in flow (No Booking Found)
      if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
        Serial.println("RFID Card Detected!");
        rfid.PICC_HaltA();
        rfid.PCD_StopCrypto1();
        changeState(STATE_RFID_SCANNED_NO_BOOKING);
      }
      break;

    // ----------------------------------------------------
    case STATE_RFID_SCANNED_NO_BOOKING:
      if (stateJustChanged) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("RFID Scanned");
        lcd.setCursor(0, 1);
        lcd.print("No Booking Found");
        
        // Immediate physical feedback: Blink for 2 seconds
        Serial.println("Blinking Green LED and Buzzer for 2 seconds...");
        for (int i = 0; i < 2; i++) {
          digitalWrite(GREEN_LED, HIGH);
          digitalWrite(BUZZER, HIGH);
          delay(500); 
          digitalWrite(BUZZER, LOW);
          digitalWrite(GREEN_LED, LOW);
          delay(500); 
        }
        
        stateJustChanged = false;
      }
      if (elapsedTime >= 2000) {
        changeState(STATE_WALKIN_PROMPT);
      }
      break;

    // ----------------------------------------------------
    case STATE_WALKIN_PROMPT:
      if (stateJustChanged) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Walk-in Booking");
        lcd.setCursor(0, 1);
        lcd.print("Press A:Yes C:No");
        stateJustChanged = false;
      }
      if (key == 'A') changeState(STATE_BOARDING_LOC);
      else if (key == 'C') changeState(STATE_CANCELLED);
      else if (elapsedTime >= 10000) changeState(STATE_TIMEOUT);
      break;

    // ----------------------------------------------------
    case STATE_BOARDING_LOC:
      if (stateJustChanged) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Boarding From:");
        lcd.setCursor(0, 1);
        lcd.print("NAMAKKAL");
        stateJustChanged = false;
        currentDestIndex = 0; // Reset scroll position
      }
      if (elapsedTime >= 2500) changeState(STATE_DEST_MENU);
      break;

    // ----------------------------------------------------
    case STATE_DEST_MENU:
      if (stateJustChanged) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Select Dest:");
        lcd.setCursor(0, 1);
        lcd.print(destinations[currentDestIndex]);
        stateJustChanged = false;
      }
      
      if (key) {
        if (key == '#') {
          // Scroll forward
          currentDestIndex = (currentDestIndex + 1) % NUM_DESTINATIONS;
          stateJustChanged = true;
        } else if (key == '*') {
          // Scroll backward
          currentDestIndex = (currentDestIndex - 1 + NUM_DESTINATIONS) % NUM_DESTINATIONS;
          stateJustChanged = true;
        } else if (key == 'C') {
          changeState(STATE_CANCELLED);
        } else if (key >= '1' && key <= '4') {
          // Check if they pressed the number shown on screen
          int selectedNumber = key - '0';
          if (selectedNumber == (currentDestIndex + 1)) {
            changeState(STATE_SELECTED_CONFIRM);
          }
        }
      }
      if (elapsedTime >= 30000) changeState(STATE_TIMEOUT);
      break;

    // ----------------------------------------------------
    case STATE_SELECTED_CONFIRM:
      if (stateJustChanged) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Selected:");
        lcd.setCursor(0, 1);
        String name = shortNames[currentDestIndex];
        name.toUpperCase();
        lcd.print(name);
        stateJustChanged = false;
      }
      if (elapsedTime >= 1500) changeState(STATE_FARE_DISPLAY);
      break;

    // ----------------------------------------------------
    case STATE_FARE_DISPLAY:
      if (stateJustChanged) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print(shortNames[currentDestIndex] + ": Rs." + String(fares[currentDestIndex]));
        lcd.setCursor(0, 1);
        lcd.print("A=Yes   C=Cancel");
        stateJustChanged = false;
      }
      if (key == 'A') changeState(STATE_CHECKING_WALLET);
      else if (key == 'C') changeState(STATE_CANCELLED);
      else if (elapsedTime >= 20000) changeState(STATE_TIMEOUT);
      break;

    // ----------------------------------------------------
    case STATE_CHECKING_WALLET:
      if (stateJustChanged) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Checking Wallet.");
        lcd.setCursor(0, 1);
        lcd.print("Please wait...");
        stateJustChanged = false;
      }
      if (elapsedTime >= 800) {
        if (simulatedWalletBalance >= fares[currentDestIndex]) {
          changeState(STATE_ALLOCATING_SEAT);
        } else {
          changeState(STATE_LOW_BALANCE);
        }
      }
      break;

    // ----------------------------------------------------
    case STATE_ALLOCATING_SEAT:
      if (stateJustChanged) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Allocating Seat.");
        lcd.setCursor(0, 1);
        lcd.print("Please wait...");
        stateJustChanged = false;
      }
      if (elapsedTime >= 500) changeState(STATE_SUCCESS);
      break;

    // ----------------------------------------------------
    case STATE_SUCCESS:
      if (stateJustChanged) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Boarded! Seat22B");
        lcd.setCursor(0, 1);
        int remaining = simulatedWalletBalance - fares[currentDestIndex];
        lcd.print("Bal:Rs." + String(remaining) + " Enjoy!");
        
        // Success Feedback
        digitalWrite(GREEN_LED, HIGH);
        digitalWrite(BUZZER, HIGH);
        delay(200);
        digitalWrite(BUZZER, LOW);
        
        stateJustChanged = false;
      }
      if (elapsedTime >= 4000) {
        digitalWrite(GREEN_LED, LOW);
        changeState(STATE_STANDBY);
      }
      break;

    // ----------------------------------------------------
    case STATE_LOW_BALANCE:
      if (stateJustChanged) {
        int shortfall = fares[currentDestIndex] - simulatedWalletBalance;
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Low Balance!");
        lcd.setCursor(0, 1);
        lcd.print("Need Rs." + String(shortfall) + " more");
        
        digitalWrite(RED_LED, HIGH);
        
        // 3 angry beeps
        for(int i=0; i<3; i++){
          digitalWrite(BUZZER, HIGH);
          delay(100);
          digitalWrite(BUZZER, LOW);
          delay(100);
        }
        stateJustChanged = false;
      }
      if (elapsedTime >= 4000) {
        digitalWrite(RED_LED, LOW);
        // Show Top-up instructions
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Add money via App");
        lcd.setCursor(0, 1);
        lcd.print("or Counter Recharge");
        delay(3000); // blocking delay here is fine for simple return
        changeState(STATE_STANDBY);
      }
      break;

    // ----------------------------------------------------
    case STATE_CANCELLED:
      if (stateJustChanged) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Booking Canceled");
        lcd.setCursor(0, 1);
        lcd.print("Have a nice day!");
        stateJustChanged = false;
      }
      if (elapsedTime >= 2000) changeState(STATE_STANDBY);
      break;

    // ----------------------------------------------------
    case STATE_TIMEOUT:
      if (stateJustChanged) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Session Timeout");
        lcd.setCursor(0, 1);
        lcd.print("Please try again");
        stateJustChanged = false;
      }
      if (elapsedTime >= 2000) changeState(STATE_STANDBY);
      break;
  }
}

// Helper to transition state cleanly
void changeState(SystemState newState) {
  currentState = newState;
  stateJustChanged = true;
  stateStartTime = millis();
}
