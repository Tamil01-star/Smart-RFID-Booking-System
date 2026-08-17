#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Keypad.h>

// WiFi Credentials
const char* ssid = "ZENKAI_MONARCH";
const char* password = "********";

// LIVE API Endpoint
const char* apiEndpoint = "https://smart-rfid-booking-system-tawny.vercel.app/api/hardware/scan";

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
// PASSENGER CATEGORIES & PRICING
// ==========================================
enum PassengerCategory {
  CAT_GENERAL,       // 100% Fare
  CAT_STUDENT,       // 50% Fare
  CAT_SENIOR,        // 40% Fare
  CAT_DISABLED,      // 25% Fare
  CAT_EX_SERVICEMAN  // Free (0)
};

PassengerCategory currentCategory = CAT_GENERAL;

int calculateFare(int baseFare, PassengerCategory category) {
  switch(category) {
    case CAT_STUDENT: return baseFare * 0.50; 
    case CAT_SENIOR: return baseFare * 0.40;
    case CAT_DISABLED: return baseFare * 0.25;
    case CAT_EX_SERVICEMAN: return 0;
    case CAT_GENERAL:
    default: return baseFare;
  }
}

void cycleCategory() {
  currentCategory = (PassengerCategory)(((int)currentCategory + 1) % 5);
  Serial.print("Demo Mode: Switched to Category ID ");
  Serial.println((int)currentCategory);
}

// ==========================================
// STATE MACHINE CONFIGURATION
// ==========================================
enum SystemState {
  STATE_STANDBY,
  STATE_VERIFYING_RFID_API,
  STATE_RFID_SCANNED_NO_BOOKING,
  STATE_RFID_SCANNED_BOOKED,
  STATE_RFID_LOW_BALANCE,
  STATE_WALKIN_PROMPT,
  STATE_MULTIPLE_BOOKING_PROMPT,
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

// Manually declare prototype to fix Arduino IDE compilation error
void changeState(SystemState newState);

SystemState currentState = STATE_STANDBY;
bool stateJustChanged = true;
unsigned long stateStartTime = 0;

// Booking Variables
String lastScannedUID = "";
int ticketCount = 1;
int currentDestIndex = 0; 
const int NUM_DESTINATIONS = 4;
String destinations[NUM_DESTINATIONS] = {"1.Tiruchengode", "2.Erode", "3.Tiruppur", "4.Coimbatore"};
String shortNames[NUM_DESTINATIONS] = {"T.Gode", "Erode", "T.Pur", "CBE"}; // Shortened to fit 16x2 LCD

int baseFares[NUM_DESTINATIONS] = {30, 60, 85, 115}; 
int simulatedWalletBalance = 300;

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
  
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);
  WiFi.begin(ssid, password);
  
  Serial.print("Connecting to WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) { // 10s timeout
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  lcd.clear();
  lcd.setCursor(0, 0);
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
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
        stateJustChanged = false;
      }
      
      if (key == 'A') {
         ticketCount = 1;
         cycleCategory(); 
         changeState(STATE_WALKIN_PROMPT);
      } else if (key == 'B') {
         cycleCategory(); 
         changeState(STATE_MULTIPLE_BOOKING_PROMPT);
      }
      
      // LIVE RFID TAP
      if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
        lastScannedUID = "";
        for (byte i = 0; i < rfid.uid.size; i++) {
          lastScannedUID += String(rfid.uid.uidByte[i] < 0x10 ? "0" : "");
          lastScannedUID += String(rfid.uid.uidByte[i], HEX);
        }
        lastScannedUID.toUpperCase(); // e.g. "A1B2C3D4"

        rfid.PICC_HaltA();
        rfid.PCD_StopCrypto1();
        
        changeState(STATE_VERIFYING_RFID_API);
      }
      break;

    // ----------------------------------------------------
    case STATE_VERIFYING_RFID_API:
      if (stateJustChanged) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Checking DB...");
        lcd.setCursor(0, 1);
        lcd.print("Please wait...");
        
        if (WiFi.status() == WL_CONNECTED) {
          HTTPClient http;
          http.begin(apiEndpoint);
          http.addHeader("Content-Type", "application/json");
          
          String httpRequestData = "{\"uid\":\"" + lastScannedUID + "\",\"bus_id\":\"1\"}";
          Serial.print("Sending POST: ");
          Serial.println(httpRequestData);
          
          int httpResponseCode = http.POST(httpRequestData);
          
          if (httpResponseCode > 0) {
            String payload = http.getString();
            Serial.print("HTTP Response code: ");
            Serial.println(httpResponseCode);
            Serial.println(payload);
            
            if (httpResponseCode == 200) {
               changeState(STATE_RFID_SCANNED_BOOKED);
            } else if (httpResponseCode == 402) {
               changeState(STATE_RFID_LOW_BALANCE);
            } else {
               changeState(STATE_RFID_SCANNED_NO_BOOKING);
            }
          } else {
            Serial.print("Error code: ");
            Serial.println(httpResponseCode);
            changeState(STATE_RFID_SCANNED_NO_BOOKING); 
          }
          http.end();
        } else {
          Serial.println("WiFi Disconnected");
          changeState(STATE_RFID_SCANNED_NO_BOOKING);
        }
        stateJustChanged = false;
      }
      break;

    // ----------------------------------------------------
    case STATE_RFID_LOW_BALANCE:
      if (stateJustChanged) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Insufficient Bal");
        lcd.setCursor(0, 1);
        lcd.print("Please Recharge");
        
        digitalWrite(RED_LED, HIGH);
        for(int i=0; i<3; i++){
          digitalWrite(BUZZER, HIGH);
          delay(150);
          digitalWrite(BUZZER, LOW);
          delay(150);
        }
        stateJustChanged = false;
      }
      if (elapsedTime >= 3000) {
        digitalWrite(RED_LED, LOW);
        changeState(STATE_STANDBY); // Cannot board
      }
      break;

    // ----------------------------------------------------
    case STATE_RFID_SCANNED_NO_BOOKING:
      if (stateJustChanged) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Not Booked Early");
        lcd.setCursor(0, 1);
        lcd.print("Walk-in starts..");
        
        for (int i = 0; i < 2; i++) {
          digitalWrite(RED_LED, HIGH);
          digitalWrite(BUZZER, HIGH);
          delay(300); 
          digitalWrite(BUZZER, LOW);
          digitalWrite(RED_LED, LOW);
          delay(300); 
        }
        
        stateJustChanged = false;
      }
      if (elapsedTime >= 1500) {
        ticketCount = 1;
        cycleCategory(); // Rotate category for Walk-in demo
        changeState(STATE_WALKIN_PROMPT); 
      }
      break;

    // ----------------------------------------------------
    case STATE_RFID_SCANNED_BOOKED:
      if (stateJustChanged) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("ID: " + lastScannedUID); 
        lcd.setCursor(0, 1);
        lcd.print("Booked Seat 22B"); 
        
        digitalWrite(GREEN_LED, HIGH);
        digitalWrite(BUZZER, HIGH);
        delay(1000); 
        digitalWrite(BUZZER, LOW);
        digitalWrite(GREEN_LED, LOW);
        
        stateJustChanged = false;
      }
      if (elapsedTime >= 3000) {
        changeState(STATE_STANDBY); 
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
    case STATE_MULTIPLE_BOOKING_PROMPT:
      if (stateJustChanged) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Multiple Booking");
        lcd.setCursor(0, 1);
        lcd.print("Tickets(1-9)?");
        stateJustChanged = false;
      }
      if (key >= '1' && key <= '9') {
        ticketCount = key - '0';
        changeState(STATE_BOARDING_LOC);
      } else if (key == 'C') {
        changeState(STATE_CANCELLED);
      }
      if (elapsedTime >= 15000) changeState(STATE_TIMEOUT);
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
        currentDestIndex = 0; 
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
          currentDestIndex = (currentDestIndex + 1) % NUM_DESTINATIONS;
          stateJustChanged = true;
        } else if (key == '*') {
          currentDestIndex = (currentDestIndex - 1 + NUM_DESTINATIONS) % NUM_DESTINATIONS;
          stateJustChanged = true;
        } else if (key == 'C') {
          changeState(STATE_CANCELLED);
        } else if (key >= '1' && key <= '4') {
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
        
        int singleFare = calculateFare(baseFares[currentDestIndex], currentCategory);
        int totalFare = singleFare * ticketCount;
        
        if (ticketCount > 1) {
          lcd.print(String(ticketCount) + " Tkt: Rs." + String(totalFare));
        } else {
          lcd.print(shortNames[currentDestIndex] + ": Rs." + String(totalFare));
        }
        
        lcd.setCursor(0, 1);
        lcd.print("A=Yes C=Cancel"); // Shortened
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
        int singleFare = calculateFare(baseFares[currentDestIndex], currentCategory);
        int totalFare = singleFare * ticketCount;
        
        if (simulatedWalletBalance >= totalFare) {
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
        if (ticketCount > 1) {
           lcd.print(String(ticketCount) + " Seats Booked!");
        } else {
           lcd.print("Boarded! Seat22B");
        }
        
        lcd.setCursor(0, 1);
        int singleFare = calculateFare(baseFares[currentDestIndex], currentCategory);
        int totalFare = singleFare * ticketCount;
        int remaining = simulatedWalletBalance - totalFare;
        
        lcd.print("Bal: Rs." + String(remaining)); // Removed "Enjoy!" to fit on screen
        
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
        int singleFare = calculateFare(baseFares[currentDestIndex], currentCategory);
        int totalFare = singleFare * ticketCount;
        int shortfall = totalFare - simulatedWalletBalance;
        
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Low Balance!");
        lcd.setCursor(0, 1);
        lcd.print("Need Rs." + String(shortfall) + " more");
        
        digitalWrite(RED_LED, HIGH);
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
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Add money via App");
        lcd.setCursor(0, 1);
        lcd.print("or Counter Recharge");
        delay(3000); 
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
