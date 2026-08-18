#include <WiFi.h>
#include <WiFiClientSecure.h>
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

// HARDCODED BUS NUMBER
const char* HARDCODED_BUS_NUMBER = "NS893";

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
// DYNAMIC FARE SYSTEM (FROM SPEC)
// ==========================================
enum BusType {
  BUS_ORDINARY,
  BUS_EXPRESS,
  BUS_AC
};

BusType currentBusType = BUS_ORDINARY;

void cycleBusType() {
  currentBusType = (BusType)(((int)currentBusType + 1) % 3);
  Serial.print("Demo Mode: Switched to Bus Type ");
  Serial.println((int)currentBusType);
}

const int NUM_STOPS = 9;
String stopNames[NUM_STOPS] = {"1.Salem", "2.Namakkal", "3.Karur", "4.Dindigul", "5.Madurai", "6.V.Nagar", "7.T.Veli", "8.N.coil", "9.Tvm"};
String shortNames[NUM_STOPS] = {"Salem", "N.kal", "Karur", "D.gul", "M.urai", "V.Ngr", "T.Veli", "N.coil", "Tvm"};
int cumulativeDist[NUM_STOPS] = {0, 52, 97, 202, 267, 315, 440, 523, 593};
float fareRates[3] = {2.00, 2.75, 4.00};

int calculateFare(int startIdx, int endIdx, BusType type) {
  if (startIdx >= endIdx) return 0;
  int dist = cumulativeDist[endIdx] - cumulativeDist[startIdx];
  float calculated = dist * fareRates[(int)type];
  int finalFare = round(calculated / 5.0) * 5;
  return finalFare;
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

// Manually declare prototype
void changeState(SystemState newState);

SystemState currentState = STATE_STANDBY;
bool stateJustChanged = true;
unsigned long stateStartTime = 0;

// Booking Variables
String lastScannedUID = "";
String assignedSeat = "TBD";
int ticketCount = 1;
int currentBoardingIndex = 0;
int currentDestIndex = 1; 

int simulatedWalletBalance = 3000;

// ==========================================
// SETUP
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
  while (WiFi.status() != WL_CONNECTED && attempts < 20) { 
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
        lcd.print("Bus: ");
        lcd.print(HARDCODED_BUS_NUMBER);
        lcd.setCursor(0, 1);
        lcd.print("Tap RFID to Brd ");
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
      
      // LIVE RFID TAP
      if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
        lastScannedUID = "";
        for (byte i = 0; i < rfid.uid.size; i++) {
          lastScannedUID += String(rfid.uid.uidByte[i] < 0x10 ? "0" : "");
          lastScannedUID += String(rfid.uid.uidByte[i], HEX);
        }
        lastScannedUID.toUpperCase(); 

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
          WiFiClientSecure client;
          client.setInsecure(); // Required for HTTPS
          
          HTTPClient http;
          http.begin(client, apiEndpoint);
          http.addHeader("Content-Type", "application/json");
          
          String httpRequestData = "{\"uid\":\"" + lastScannedUID + "\",\"bus_number\":\"" + String(HARDCODED_BUS_NUMBER) + "\"}";
          Serial.print("Sending POST: ");
          Serial.println(httpRequestData);
          
          int httpResponseCode = http.POST(httpRequestData);
          
          if (httpResponseCode > 0) {
            String payload = http.getString();
            Serial.print("HTTP Response: ");
            Serial.println(httpResponseCode);
            Serial.println(payload);
            
            if (httpResponseCode == 200) {
               int seatIndex = payload.indexOf("\"seatNumber\":\"");
               if (seatIndex != -1) {
                  seatIndex += 14;
                  int endQuote = payload.indexOf("\"", seatIndex);
                  assignedSeat = payload.substring(seatIndex, endQuote);
               } else {
                  assignedSeat = "TBD";
               }
               changeState(STATE_RFID_SCANNED_BOOKED);
            } else if (httpResponseCode == 409) {
               changeState(STATE_RFID_ALREADY_BOARDED);
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
        changeState(STATE_STANDBY); 
      }
      break;

    // ----------------------------------------------------
    case STATE_RFID_SCANNED_NO_BOOKING:
      if (stateJustChanged) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Not Booked Early");
        lcd.setCursor(0, 1);
        lcd.print("Manual Booking");
        
        // Glow Red LED solidly
        digitalWrite(RED_LED, HIGH);
        
        // Two times of buzzer
        for (int i = 0; i < 2; i++) {
          digitalWrite(BUZZER, HIGH);
          delay(200); 
          digitalWrite(BUZZER, LOW);
          delay(200); 
        }
        
        stateJustChanged = false;
      }
      if (elapsedTime >= 2000) {
        digitalWrite(RED_LED, LOW); // Turn off Red LED before moving
        ticketCount = 1;
        cycleBusType(); 
        changeState(STATE_WALKIN_PROMPT); 
      }
      break;

    // ----------------------------------------------------
    case STATE_RFID_ALREADY_BOARDED:
      if (stateJustChanged) {
        lcd.clear();
        lcd.setCursor(0, 0);
        
        String shortUid = lastScannedUID;
        if(shortUid.length() > 11) { shortUid = shortUid.substring(0, 11); }
        lcd.print("ID: " + shortUid); 
        
        lcd.setCursor(0, 1);
        lcd.print("Already Boarded"); 
        
        digitalWrite(GREEN_LED, LOW);
        for(int i=0; i<3; i++){
           digitalWrite(BUZZER, HIGH);
           delay(100);
           digitalWrite(BUZZER, LOW);
           delay(100);
        }
        
        stateJustChanged = false;
      }
      if (elapsedTime >= 3000) {
        changeState(STATE_STANDBY); 
      }
      break;

    // ----------------------------------------------------
    case STATE_RFID_SCANNED_BOOKED:
      if (stateJustChanged) {
        lcd.clear();
        lcd.setCursor(0, 0);
        
        String shortUid = lastScannedUID;
        if(shortUid.length() > 11) { shortUid = shortUid.substring(0, 11); }
        lcd.print("ID: " + shortUid); 
        
        lcd.setCursor(0, 1);
        lcd.print("Booked..Seat: " + assignedSeat); 
        
        // Glow Green LED solidly
        digitalWrite(GREEN_LED, HIGH);
        
        // Once buzzer will play (1 clear beep)
        digitalWrite(BUZZER, HIGH);
        delay(400); 
        digitalWrite(BUZZER, LOW);
        
        stateJustChanged = false;
      }
      if (elapsedTime >= 3000) {
        digitalWrite(GREEN_LED, LOW); 
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
        lcd.print("Select Boarding:");
        lcd.setCursor(0, 1);
        lcd.print(stopNames[currentBoardingIndex]);
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
        }
      }
      if (elapsedTime >= 30000) changeState(STATE_TIMEOUT);
      break;

    // ----------------------------------------------------
    case STATE_DEST_MENU:
      if (stateJustChanged) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Select Dest:");
        lcd.setCursor(0, 1);
        lcd.print(stopNames[currentDestIndex]);
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
        }
      }
      if (elapsedTime >= 30000) changeState(STATE_TIMEOUT);
      break;

    // ----------------------------------------------------
    case STATE_SELECTED_CONFIRM:
      if (stateJustChanged) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Selected Dest:");
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
        
        int singleFare = calculateFare(currentBoardingIndex, currentDestIndex, currentBusType);
        int totalFare = singleFare * ticketCount;
        
        if (ticketCount > 1) {
          lcd.print(String(ticketCount) + " Tkt: Rs." + String(totalFare));
        } else {
          lcd.print(shortNames[currentDestIndex] + ": Rs." + String(totalFare));
        }
        
        lcd.setCursor(0, 1);
        lcd.print("A=Yes C=Cancel"); 
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
        int singleFare = calculateFare(currentBoardingIndex, currentDestIndex, currentBusType);
        int totalFare = singleFare * ticketCount;
        int remaining = simulatedWalletBalance - totalFare;
        
        lcd.print("Bal: Rs." + String(remaining)); 
        
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
        int singleFare = calculateFare(currentBoardingIndex, currentDestIndex, currentBusType);
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
