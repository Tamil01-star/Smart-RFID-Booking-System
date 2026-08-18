#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Keypad.h>

// ==========================================
// SYSTEM CONFIGURATION
// ==========================================
const char* ssid = "ZENKAI_MONARCH";
const char* password = "********";
const char* apiEndpoint = "https://backend-sigma-beige-36.vercel.app/api/esp32/scan";
const char* HARDCODED_BUS_NUMBER = "SB-101";

// ==========================================
// HARDWARE PIN CONFIGURATION
// ==========================================
// RFID Pins
#define RFID_SS_PIN    5
#define RFID_RST_PIN   17

// LED & Buzzer Pins
#define GREEN_LED_PIN  4
#define RED_LED_PIN    2
#define BUZZER_PIN     15

// GPS Pins (RESERVED FOR FUTURE USE)
#define GPS_TX_PIN     16
#define GPS_RX_PIN     34

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
MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

// ==========================================
// DYNAMIC FARE DATABASE (FROM SPEC)
// ==========================================
enum BusType { BUS_ORDINARY, BUS_EXPRESS, BUS_AC };
BusType currentBusType = BUS_ORDINARY;

const int NUM_STOPS = 9;
String stopNames[NUM_STOPS] = {"1.Salem", "2.Namakkal", "3.Karur", "4.Dindigul", "5.Madurai", "6.V.Nagar", "7.T.Veli", "8.N.coil", "9.Tvm"};
String shortNames[NUM_STOPS] = {"Salem", "N.kal", "Karur", "D.gul", "M.urai", "V.Ngr", "T.Veli", "N.coil", "Tvm"};
int cumulativeDist[NUM_STOPS] = {0, 52, 97, 202, 267, 315, 440, 523, 593};
float fareRates[3] = {2.00, 2.75, 4.00};

// Booking Variables
String lastScannedUID = "";
String assignedSeat = "TBD";
int ticketCount = 1;
int currentBoardingIndex = 0;
int currentDestIndex = 1; 
int simulatedWalletBalance = 3000;

// ==========================================
// HARDWARE CONTROL MODULES
// ==========================================
void greenLED(bool state) {
  digitalWrite(GREEN_LED_PIN, state ? HIGH : LOW);
}

void redLED(bool state) {
  digitalWrite(RED_LED_PIN, state ? HIGH : LOW);
}

void showLCD(String row1, String row2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(row1);
  lcd.setCursor(0, 1);
  lcd.print(row2);
}

// ==========================================
// BUZZER PATTERN MODULES
// ==========================================
void buzzerValid() {
  // 1 short beep
  digitalWrite(BUZZER_PIN, HIGH);
  delay(150);
  digitalWrite(BUZZER_PIN, LOW);
}

void buzzerNotBooked() {
  // 2 short beeps
  for(int i=0; i<2; i++){
    digitalWrite(BUZZER_PIN, HIGH);
    delay(150);
    digitalWrite(BUZZER_PIN, LOW);
    if(i==0) delay(150);
  }
}

void buzzerInvalid() {
  // 3 short beeps
  for(int i=0; i<3; i++){
    digitalWrite(BUZZER_PIN, HIGH);
    delay(150);
    digitalWrite(BUZZER_PIN, LOW);
    if(i<2) delay(150);
  }
}

void buzzerGPSPickup() {
  // 1 long beep
  digitalWrite(BUZZER_PIN, HIGH);
  delay(800);
  digitalWrite(BUZZER_PIN, LOW);
}

void buzzerGPSDestination() {
  // 2 long beeps
  for(int i=0; i<2; i++){
    digitalWrite(BUZZER_PIN, HIGH);
    delay(800);
    digitalWrite(BUZZER_PIN, LOW);
    if(i==0) delay(400);
  }
}

// ==========================================
// BUSINESS LOGIC MODULES
// ==========================================
bool readRFID(String &uidStr) {
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    uidStr = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
      uidStr += String(rfid.uid.uidByte[i] < 0x10 ? "0" : "");
      uidStr += String(rfid.uid.uidByte[i], HEX);
    }
    uidStr.toUpperCase(); 
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    return true;
  }
  return false;
}

int checkBooking(String uid, String &outSeat) {
  if (WiFi.status() != WL_CONNECTED) return -1; // Network error

  WiFiClientSecure client;
  client.setInsecure(); // Required for HTTPS
  
  HTTPClient http;
  http.begin(client, apiEndpoint);
  http.addHeader("Content-Type", "application/json");
  
  String httpRequestData = "{\"uid\":\"" + uid + "\",\"bus_number\":\"" + String(HARDCODED_BUS_NUMBER) + "\"}";
  int httpResponseCode = http.POST(httpRequestData);
  
  if (httpResponseCode == 200) {
     String payload = http.getString();
     int seatIndex = payload.indexOf("\"seatNumber\":\"");
     if (seatIndex != -1) {
        seatIndex += 14;
        int endQuote = payload.indexOf("\"", seatIndex);
        outSeat = payload.substring(seatIndex, endQuote);
     } else {
        outSeat = "TBD";
     }
  }
  http.end();
  return httpResponseCode;
}

int calculateFare(int startIdx, int endIdx, BusType type) {
  if (startIdx >= endIdx) return 0;
  int dist = cumulativeDist[endIdx] - cumulativeDist[startIdx];
  float calculated = dist * fareRates[(int)type];
  int finalFare = round(calculated / 5.0) * 5;
  return finalFare;
}

void checkGPSStop() {
  // GPS integration placeholder
  // float lat = gps.getLatitude();
  // float lng = gps.getLongitude();
  // if (matchesPickup(lat, lng)) {
  //    greenLED(true);
  //    buzzerGPSPickup();
  //    showLCD("PICKUP STOP", stopNames[currentBoardingIndex]);
  // }
}

void cycleBusType() {
  currentBusType = (BusType)(((int)currentBusType + 1) % 3);
  Serial.print("Demo Mode: Switched to Bus Type ");
  Serial.println((int)currentBusType);
}

// ==========================================
// STATE MACHINE CONFIGURATION
// ==========================================
enum SystemState {
  STATE_STANDBY,
  STATE_VERIFYING_RFID_API,
  STATE_RFID_SCANNED_NO_BOOKING,
  STATE_RFID_SCANNED_BOOKED,
  STATE_RFID_ALREADY_BOARDED,
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

void changeState(SystemState newState);

SystemState currentState = STATE_STANDBY;
bool stateJustChanged = true;
unsigned long stateStartTime = 0;


// ==========================================
// SETUP
// ==========================================
void setup() {
  Serial.begin(115200);
  
  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  greenLED(false);
  redLED(false);
  digitalWrite(BUZZER_PIN, LOW);
  
  lcd.init();
  lcd.backlight();
  showLCD("Smart Bus System", "Connecting WiFi.");
  
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);
  WiFi.begin(ssid, password);
  
  Serial.print("Connecting to WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) { 
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    showLCD("Smart Bus System", "WiFi Connected!");
  } else {
    Serial.println("\nWiFi Failed!");
    showLCD("Smart Bus System", "WiFi Failed!");
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
  
  checkGPSStop(); // Run future GPS logic continuously

  switch(currentState) {
    // ----------------------------------------------------
    case STATE_STANDBY:
      if (stateJustChanged) {
        String r1 = "Bus: ";
        r1 += HARDCODED_BUS_NUMBER;
        showLCD(r1, "Tap RFID to Brd ");
        greenLED(false);
        redLED(false);
        stateJustChanged = false;
      }
      
      if (key == 'A') {
         ticketCount = 1;
         cycleBusType(); 
         changeState(STATE_WALKIN_PROMPT);
      } else if (key == 'B') {
         cycleBusType(); 
         changeState(STATE_MULTIPLE_BOOKING_PROMPT);
      }
      
      if (readRFID(lastScannedUID)) {
         changeState(STATE_VERIFYING_RFID_API);
      }
      break;

    // ----------------------------------------------------
    case STATE_VERIFYING_RFID_API:
      if (stateJustChanged) {
        showLCD("Checking DB...", "Please wait...");
        
        int responseCode = checkBooking(lastScannedUID, assignedSeat);
        
        if (responseCode == 200) {
           changeState(STATE_RFID_SCANNED_BOOKED);
        } else if (responseCode == 409) {
           changeState(STATE_RFID_ALREADY_BOARDED);
        } else if (responseCode == 404) {
           changeState(STATE_RFID_SCANNED_NO_BOOKING);
        } else {
           // Network Error, 400, 403, 500 etc. Treat as invalid/not booked.
           changeState(STATE_RFID_SCANNED_NO_BOOKING);
        }
        stateJustChanged = false;
      }
      break;

    // ----------------------------------------------------
    case STATE_RFID_SCANNED_NO_BOOKING:
      if (stateJustChanged) {
        showLCD("Not Booked Early", "Manual Booking");
        redLED(true);
        buzzerNotBooked();
        stateJustChanged = false;
      }
      if (elapsedTime >= 2000) {
        redLED(false);
        ticketCount = 1;
        cycleBusType(); 
        changeState(STATE_WALKIN_PROMPT); 
      }
      break;

    // ----------------------------------------------------
    case STATE_RFID_ALREADY_BOARDED:
      if (stateJustChanged) {
        String shortUid = lastScannedUID;
        if(shortUid.length() > 11) { shortUid = shortUid.substring(0, 11); }
        showLCD("ID: " + shortUid, "Already Boarded"); 
        
        redLED(true); // Red LED for error condition
        buzzerInvalid();
        stateJustChanged = false;
      }
      if (elapsedTime >= 3000) {
        redLED(false);
        changeState(STATE_STANDBY); 
      }
      break;

    // ----------------------------------------------------
    case STATE_RFID_SCANNED_BOOKED:
      if (stateJustChanged) {
        String shortUid = lastScannedUID;
        if(shortUid.length() > 11) { shortUid = shortUid.substring(0, 11); }
        showLCD("ID: " + shortUid, "Booked..Seat: " + assignedSeat); 
        
        greenLED(true);
        buzzerValid();
        stateJustChanged = false;
      }
      if (elapsedTime >= 3000) {
        greenLED(false); 
        changeState(STATE_STANDBY); 
      }
      break;

    // ----------------------------------------------------
    case STATE_WALKIN_PROMPT:
      if (stateJustChanged) {
        showLCD("Walk-in Booking", "Press A:Yes C:No");
        stateJustChanged = false;
      }
      if (key == 'A') changeState(STATE_BOARDING_LOC);
      else if (key == 'C') changeState(STATE_CANCELLED);
      else if (elapsedTime >= 10000) changeState(STATE_TIMEOUT);
      break;

    // ----------------------------------------------------
    case STATE_MULTIPLE_BOOKING_PROMPT:
      if (stateJustChanged) {
        showLCD("Multiple Booking", "Tickets(1-9)?");
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
        showLCD("Select Pickup:", stopNames[currentBoardingIndex]);
        stateJustChanged = false;
      }
      
      if (key) {
        if (key == '#') {
          currentBoardingIndex = (currentBoardingIndex + 1) % (NUM_STOPS - 1);
          stateJustChanged = true;
        } else if (key == '*') {
          currentBoardingIndex = (currentBoardingIndex - 1 + (NUM_STOPS - 1)) % (NUM_STOPS - 1);
          stateJustChanged = true;
        } else if (key == 'C') {
          changeState(STATE_CANCELLED);
        } else if (key >= '1' && key <= '8') { 
          int selectedNumber = key - '0';
          if (selectedNumber == (currentBoardingIndex + 1)) {
            currentDestIndex = currentBoardingIndex + 1;
            changeState(STATE_DEST_MENU);
          }
        } else if (key == 'A') {
            currentDestIndex = currentBoardingIndex + 1;
            changeState(STATE_DEST_MENU);
        }
      }
      if (elapsedTime >= 30000) changeState(STATE_TIMEOUT);
      break;

    // ----------------------------------------------------
    case STATE_DEST_MENU:
      if (stateJustChanged) {
        showLCD("Select Dest:", stopNames[currentDestIndex]);
        stateJustChanged = false;
      }
      
      if (key) {
        if (key == '#') {
          currentDestIndex++;
          if (currentDestIndex >= NUM_STOPS) currentDestIndex = currentBoardingIndex + 1;
          stateJustChanged = true;
        } else if (key == '*') {
          currentDestIndex--;
          if (currentDestIndex <= currentBoardingIndex) currentDestIndex = NUM_STOPS - 1;
          stateJustChanged = true;
        } else if (key == 'C') {
          changeState(STATE_CANCELLED);
        } else if (key >= '1' && key <= '9') {
          int selectedNumber = key - '0';
          if (selectedNumber == (currentDestIndex + 1)) {
            changeState(STATE_SELECTED_CONFIRM);
          }
        } else if (key == 'A') {
            changeState(STATE_SELECTED_CONFIRM);
        }
      }
      if (elapsedTime >= 30000) changeState(STATE_TIMEOUT);
      break;

    // ----------------------------------------------------
    case STATE_SELECTED_CONFIRM:
      if (stateJustChanged) {
        String name = shortNames[currentDestIndex];
        name.toUpperCase();
        showLCD("Selected Dest:", name);
        stateJustChanged = false;
      }
      if (elapsedTime >= 1500) changeState(STATE_FARE_DISPLAY);
      break;

    // ----------------------------------------------------
    case STATE_FARE_DISPLAY:
      if (stateJustChanged) {
        int singleFare = calculateFare(currentBoardingIndex, currentDestIndex, currentBusType);
        int totalFare = singleFare * ticketCount;
        
        String r1 = "";
        if (ticketCount > 1) {
          r1 = String(ticketCount) + " Tkt: Rs." + String(totalFare);
        } else {
          r1 = shortNames[currentDestIndex] + ": Rs." + String(totalFare);
        }
        
        showLCD(r1, "A=Yes C=Cancel"); 
        stateJustChanged = false;
      }
      if (key == 'A') changeState(STATE_CHECKING_WALLET);
      else if (key == 'C') changeState(STATE_CANCELLED);
      else if (elapsedTime >= 20000) changeState(STATE_TIMEOUT);
      break;

    // ----------------------------------------------------
    case STATE_CHECKING_WALLET:
      if (stateJustChanged) {
        showLCD("Checking Wallet.", "Please wait...");
        stateJustChanged = false;
      }
      if (elapsedTime >= 800) {
        int singleFare = calculateFare(currentBoardingIndex, currentDestIndex, currentBusType);
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
        showLCD("Allocating Seat.", "Please wait...");
        stateJustChanged = false;
      }
      if (elapsedTime >= 500) changeState(STATE_SUCCESS);
      break;

    // ----------------------------------------------------
    case STATE_SUCCESS:
      if (stateJustChanged) {
        String r1 = (ticketCount > 1) ? (String(ticketCount) + " Seats Booked!") : "Boarded! Seat22B";
        
        int singleFare = calculateFare(currentBoardingIndex, currentDestIndex, currentBusType);
        int totalFare = singleFare * ticketCount;
        int remaining = simulatedWalletBalance - totalFare;
        
        showLCD(r1, "Bal: Rs." + String(remaining));
        greenLED(true);
        buzzerValid();
        stateJustChanged = false;
      }
      if (elapsedTime >= 4000) {
        greenLED(false);
        changeState(STATE_STANDBY);
      }
      break;

    // ----------------------------------------------------
    case STATE_LOW_BALANCE:
      if (stateJustChanged) {
        int singleFare = calculateFare(currentBoardingIndex, currentDestIndex, currentBusType);
        int totalFare = singleFare * ticketCount;
        int shortfall = totalFare - simulatedWalletBalance;
        
        showLCD("Low Balance!", "Need Rs." + String(shortfall) + " more");
        redLED(true);
        buzzerInvalid();
        stateJustChanged = false;
      }
      if (elapsedTime >= 4000) {
        redLED(false);
        showLCD("Add money via App", "or Counter Recharge");
        delay(3000); 
        changeState(STATE_STANDBY);
      }
      break;

    // ----------------------------------------------------
    case STATE_CANCELLED:
      if (stateJustChanged) {
        showLCD("Booking Canceled", "Have a nice day!");
        stateJustChanged = false;
      }
      if (elapsedTime >= 2000) changeState(STATE_STANDBY);
      break;

    // ----------------------------------------------------
    case STATE_TIMEOUT:
      if (stateJustChanged) {
        showLCD("Session Timeout", "Please try again");
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
