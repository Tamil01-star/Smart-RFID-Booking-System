// ==========================================
// SMART BUS BOOKING SYSTEM - ESP32 FIRMWARE
// Bus: NS893 | Route: Salem -> Thiruvananthapuram
// GPS-Ready Architecture
// ==========================================

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
const char* ssid             = "ZENKAI_MONARCH";
const char* password         = "********";
const char* apiEndpoint      = "https://smart-rfid-booking-system-tawny.vercel.app/api/hardware/scan";
const char* bookEndpoint     = "https://smart-rfid-booking-system-tawny.vercel.app/api/hardware/book";
const char* HARDCODED_BUS_NUMBER = "NS893";

// ==========================================
// HARDWARE PIN CONFIGURATION
// ==========================================
#define RFID_SS_PIN    5
#define RFID_RST_PIN   17
#define GREEN_LED_PIN  4
#define RED_LED_PIN    2
#define BUZZER_PIN     15
// GPS Pins (RESERVED FOR FUTURE USE)
#define GPS_TX_PIN     16
#define GPS_RX_PIN     34

// ==========================================
// KEYPAD CONFIGURATION
// ==========================================
const byte ROWS = 4;
const byte COLS = 4;
char keys[ROWS][COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};
byte rowPins[ROWS] = {13, 12, 14, 27};
byte colPins[COLS]  = {26, 25, 33, 32};

// ==========================================
// BUS ROUTE CONFIGURATION
// ==========================================
const int NUM_STOPS = 9;
const char* stopNames[NUM_STOPS] = {
  "Salem", "Namakkal", "Karur", "Dindigul",
  "Madurai", "Virudhunagar", "Tirunelveli",
  "Nagercoil", "Trivandrum"
};
// Cumulative distance in km from Salem
const int cumulativeDist[NUM_STOPS] = {
  0, 65, 120, 200, 260, 320, 410, 480, 540
};

// Bus type enum for fare calculation
enum BusType { ORDINARY = 0, EXPRESS = 1 };
BusType currentBusType = EXPRESS;

// ==========================================
// STATE MACHINE DEFINITION
// ==========================================
enum SystemState {
  STATE_STANDBY,
  STATE_VERIFYING_RFID_API,
  STATE_RFID_SCANNED_BOOKED,
  STATE_RFID_SCANNED_NO_BOOKING,
  STATE_RFID_INVALID,             // Card NOT in DB -> RED LED + long buzz + "Not Registered"
  STATE_RFID_ALREADY_BOARDED,
  STATE_WALKIN_PROMPT,
  STATE_SELECT_DEST,
  STATE_CONFIRM_BOOKING,
  STATE_CHECKING_WALLET,
  STATE_SUCCESS,
  STATE_LOW_BALANCE,
  STATE_MULTIPLE_BOOKING_PROMPT,
  STATE_CANCELLED,
  STATE_TIMEOUT
};

SystemState currentState = STATE_STANDBY;
unsigned long stateEnteredAt = 0;
bool stateJustChanged = true;

// ==========================================
// GLOBAL VARIABLES
// ==========================================
WiFiClientSecure secureClient; // Global to prevent stack overflow
LiquidCrystal_I2C lcd(0x27, 16, 2);
MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

String lastScannedUID    = "";
String assignedSeat      = "TBD";
int    currentBoardingIndex = 0; // Default: Salem (index 0). GPS will set this later.
int    currentDestIndex     = 8;
int    ticketCount          = 1;
int    walletBalance        = 0; // Updated from database after payment

// ==========================================
// HELPER: STATE CHANGER
// ==========================================
void changeState(SystemState newState) {
  currentState      = newState;
  stateEnteredAt    = millis();
  stateJustChanged  = true;
}

// ==========================================
// HELPER: LCD PRINT (clears before printing)
// ==========================================
void showLCD(String row1, String row2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  // Pad to 16 chars to clear leftover chars
  while (row1.length() < 16) row1 += ' ';
  lcd.print(row1.substring(0, 16));
  lcd.setCursor(0, 1);
  while (row2.length() < 16) row2 += ' ';
  lcd.print(row2.substring(0, 16));
}

// ==========================================
// LED HELPERS
// ==========================================
void greenLED(bool on) { digitalWrite(GREEN_LED_PIN, on ? HIGH : LOW); }
void redLED(bool on)   { digitalWrite(RED_LED_PIN,   on ? HIGH : LOW); }

// ==========================================
// BUZZER PATTERNS
// ==========================================
void buzzerCardRead() {
  // Instant 100ms chirp on card tap
  greenLED(true);
  digitalWrite(BUZZER_PIN, HIGH); delay(100); digitalWrite(BUZZER_PIN, LOW);
  greenLED(false);
}

void buzzerValid() {
  // 1 short beep - Success
  digitalWrite(BUZZER_PIN, HIGH); delay(300); digitalWrite(BUZZER_PIN, LOW);
}

void buzzerNotBooked() {
  // 2 short beeps - Not booked
  for (int i = 0; i < 2; i++) {
    digitalWrite(BUZZER_PIN, HIGH); delay(250); digitalWrite(BUZZER_PIN, LOW);
    if (i == 0) delay(200);
  }
}

void buzzerInvalidShort() {
  // 3 short beeps - Duplicate scan
  for (int i = 0; i < 3; i++) {
    digitalWrite(BUZZER_PIN, HIGH); delay(150); digitalWrite(BUZZER_PIN, LOW);
    if (i < 2) delay(150);
  }
}

void buzzerKeyClick() {
  // Very short click on keypad press
  digitalWrite(BUZZER_PIN, HIGH); delay(40); digitalWrite(BUZZER_PIN, LOW);
}

// NOTE: buzzerInvalidLong just turns buzzer ON.
// The state machine will turn it OFF after 2000ms (non-blocking).
void buzzerInvalidLong() {
  digitalWrite(BUZZER_PIN, HIGH);
}

// ==========================================
// RFID READER
// ==========================================
bool readRFID(String &outUID) {
  if (!rfid.PICC_IsNewCardPresent()) return false;
  if (!rfid.PICC_ReadCardSerial())   return false;
  outUID = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) outUID += "0";
    outUID += String(rfid.uid.uidByte[i], HEX);
    if (i < rfid.uid.size - 1) outUID += ":";
  }
  outUID.toUpperCase();
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  return true;
}

// ==========================================
// API: CHECK BOOKING (scan endpoint)
// Returns HTTP status code. 401 = not registered.
// ==========================================
int checkBooking(String uid, String &outSeat) {
  if (WiFi.status() != WL_CONNECTED) return -1;
  HTTPClient http;
  http.begin(secureClient, apiEndpoint);
  http.addHeader("Content-Type", "application/json");
  String body = "{\"uid\":\"" + uid + "\",\"bus_number\":\"" + String(HARDCODED_BUS_NUMBER) + "\"}";
  int code = http.POST(body);
  if (code == 200) {
    String payload = http.getString();
    int idx = payload.indexOf("\"seatNumber\":\"");
    if (idx != -1) {
      idx += 14;
      outSeat = payload.substring(idx, payload.indexOf("\"", idx));
    } else { outSeat = "TBD"; }
  }
  http.end();
  return code;
}

// ==========================================
// API: PROCESS PAYMENT (book endpoint)
// Returns HTTP status code. 402 = low balance. 401 = not registered.
// ==========================================
int processPayment(String uid, int fareAmount, String &outSeat, int &outBalance) {
  if (WiFi.status() != WL_CONNECTED) return -1;
  HTTPClient http;
  http.begin(secureClient, bookEndpoint);
  http.addHeader("Content-Type", "application/json");
  String body = "{\"uid\":\"" + uid + "\",\"bus_number\":\"" + String(HARDCODED_BUS_NUMBER) + "\",\"fare\":" + String(fareAmount) + "}";
  int code = http.POST(body);
  if (code == 200) {
    String payload = http.getString();
    int sIdx = payload.indexOf("\"seatNumber\":\"");
    if (sIdx != -1) { sIdx += 14; outSeat = payload.substring(sIdx, payload.indexOf("\"", sIdx)); }
    else { outSeat = "TBD"; }
    int bIdx = payload.indexOf("\"newBalance\":");
    if (bIdx != -1) { bIdx += 13; outBalance = payload.substring(bIdx, payload.indexOf("}", bIdx)).toInt(); }
  }
  http.end();
  return code;
}

// ==========================================
// FARE CALCULATOR
// ==========================================
int calculateFare(int fromIdx, int toIdx, BusType type) {
  if (fromIdx >= toIdx) return 0;
  int dist = cumulativeDist[toIdx] - cumulativeDist[fromIdx];
  int ratePerKm = (type == EXPRESS) ? 2 : 1;
  int fare = dist * ratePerKm;
  // Round to nearest 5
  return ((fare + 4) / 5) * 5;
}

// ==========================================
// GPS PLACEHOLDER (for future integration)
// ==========================================
int getGPSBoardingIndex() {
  // TODO: When GPS is added, read GPS coordinates and return matching stop index.
  // For now, always return 0 (Salem).
  return 0;
}

// ==========================================
// SETUP
// ==========================================
void setup() {
  Serial.begin(115200);

  // Pin Modes
  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN,   OUTPUT);
  pinMode(BUZZER_PIN,    OUTPUT);
  digitalWrite(GREEN_LED_PIN, LOW);
  digitalWrite(RED_LED_PIN,   LOW);
  digitalWrite(BUZZER_PIN,    LOW);

  // LCD Init
  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  showLCD("Smart Bus", "Booting...");

  // RFID Init
  SPI.begin();
  rfid.PCD_Init();

  // WiFi Init
  showLCD("Connecting WiFi", ssid);
  WiFi.begin(ssid, password);
  secureClient.setInsecure(); // Accept self-signed certs
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500); attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    showLCD("WiFi Connected!", WiFi.localIP().toString());
    delay(1500);
  } else {
    showLCD("WiFi FAILED!", "Check password");
    delay(2000);
  }

  // GPS placeholder: set boarding index
  currentBoardingIndex = getGPSBoardingIndex();

  changeState(STATE_STANDBY);
}

// ==========================================
// MAIN LOOP
// ==========================================
void loop() {
  char key = keypad.getKey();
  if (key) buzzerKeyClick();

  unsigned long elapsedTime = millis() - stateEnteredAt;

  switch (currentState) {

    // ----------------------------------------
    case STATE_STANDBY:
      if (stateJustChanged) {
        showLCD("Bus: " + String(HARDCODED_BUS_NUMBER), "Tap Card to Board");
        greenLED(false);
        redLED(false);
        digitalWrite(BUZZER_PIN, LOW); // Ensure buzzer is off
        stateJustChanged = false;
      }
      if (key == 'A') { ticketCount = 1; changeState(STATE_WALKIN_PROMPT); }
      if (key == 'B') { changeState(STATE_MULTIPLE_BOOKING_PROMPT); }
      if (readRFID(lastScannedUID)) {
        buzzerCardRead();
        showLCD("Checking DB...", "Please wait...");
        changeState(STATE_VERIFYING_RFID_API);
      }
      break;

    // ----------------------------------------
    case STATE_VERIFYING_RFID_API:
      if (stateJustChanged) {
        stateJustChanged = false;
        int code = checkBooking(lastScannedUID, assignedSeat);
        Serial.print("Scan API code: "); Serial.println(code);

        if      (code == 200) changeState(STATE_RFID_SCANNED_BOOKED);
        else if (code == 409) changeState(STATE_RFID_ALREADY_BOARDED);
        else if (code == 401 || code == 403) changeState(STATE_RFID_INVALID);
        else if (code == 402) changeState(STATE_LOW_BALANCE);    // Booked but wallet too low
        else if (code == 404) changeState(STATE_RFID_SCANNED_NO_BOOKING);
        else {
          // 500 or network error
          showLCD("API Err:" + String(code), "Check Vercel");
          redLED(true);
          digitalWrite(BUZZER_PIN, HIGH); delay(2000); digitalWrite(BUZZER_PIN, LOW);
          delay(1000);
          redLED(false);
          changeState(STATE_STANDBY);
        }
      }
      break;

    // ----------------------------------------
    // 401 / 403: Card NOT registered in DB
    // Show "Not Registered" + RED LED + 2-sec long buzzer
    // ----------------------------------------
    case STATE_RFID_INVALID:
      if (stateJustChanged) {
        showLCD("Not Registered!", "UID:" + lastScannedUID);
        redLED(true);
        buzzerInvalidLong(); // Turns buzzer ON (non-blocking)
        stateJustChanged = false;
      }
      if (elapsedTime >= 2000) {
        digitalWrite(BUZZER_PIN, LOW); // Turn buzzer OFF after 2 sec
        redLED(false);
        changeState(STATE_STANDBY);
      }
      break;

    // ----------------------------------------
    // 200: Valid booking found - Boarded!
    // ----------------------------------------
    case STATE_RFID_SCANNED_BOOKED:
      if (stateJustChanged) {
        showLCD("Booked! Seat:", assignedSeat);
        greenLED(true);
        buzzerValid();
        stateJustChanged = false;
      }
      if (elapsedTime >= 4000) { greenLED(false); changeState(STATE_STANDBY); }
      break;

    // ----------------------------------------
    // 409: Already Boarded (duplicate scan)
    // ----------------------------------------
    case STATE_RFID_ALREADY_BOARDED:
      if (stateJustChanged) {
        showLCD("Already Boarded!", assignedSeat);
        greenLED(false);
        buzzerInvalidShort();
        stateJustChanged = false;
      }
      if (elapsedTime >= 3000) changeState(STATE_STANDBY);
      break;

    // ----------------------------------------
    // 404: Registered but no ticket today -> Walk-in manual booking
    // ----------------------------------------
    case STATE_RFID_SCANNED_NO_BOOKING:
      if (stateJustChanged) {
        showLCD("Not Booked!", "Press A=Manual");
        redLED(true);
        buzzerNotBooked();
        stateJustChanged = false;
      }
      if (elapsedTime >= 3000) { redLED(false); changeState(STATE_WALKIN_PROMPT); }
      if (key == 'A') { redLED(false); changeState(STATE_WALKIN_PROMPT); }
      if (key == 'C') { redLED(false); changeState(STATE_STANDBY); }
      break;

    // ----------------------------------------
    // WALK-IN: Select Destination
    // ----------------------------------------
    case STATE_WALKIN_PROMPT:
      if (stateJustChanged) {
        currentDestIndex = NUM_STOPS - 1; // Default last stop
        showLCD("Select Dest Stop", "1-9 then # to OK");
        stateJustChanged = false;
      }
      if (key >= '1' && key <= '9') {
        int idx = key - '1';
        if (idx > currentBoardingIndex && idx < NUM_STOPS) {
          currentDestIndex = idx;
          showLCD("Dest: " + String(stopNames[idx]), "# to confirm");
        }
      }
      if (key == '#') changeState(STATE_CONFIRM_BOOKING);
      if (key == 'C') changeState(STATE_STANDBY);
      if (elapsedTime >= 30000) changeState(STATE_TIMEOUT);
      break;

    // ----------------------------------------
    // WALK-IN: Confirm booking details
    // ----------------------------------------
    case STATE_CONFIRM_BOOKING:
      if (stateJustChanged) {
        int fare = calculateFare(currentBoardingIndex, currentDestIndex, currentBusType);
        showLCD("To:" + String(stopNames[currentDestIndex]), "Rs." + String(fare) + " #=Pay C=Cxl");
        stateJustChanged = false;
      }
      if (key == '#') changeState(STATE_CHECKING_WALLET);
      if (key == 'C') changeState(STATE_STANDBY);
      if (elapsedTime >= 20000) changeState(STATE_TIMEOUT);
      break;

    // ----------------------------------------
    // WALK-IN: Tap card to pay (real DB wallet check)
    // ----------------------------------------
    case STATE_CHECKING_WALLET:
      if (stateJustChanged) {
        int fare = calculateFare(currentBoardingIndex, currentDestIndex, currentBusType);
        showLCD("Rs." + String(fare) + " Due", "Tap Card to Pay");
        stateJustChanged = false;
      }
      if (readRFID(lastScannedUID)) {
        buzzerCardRead();
        showLCD("Processing...", "Please Wait");
        int fare = calculateFare(currentBoardingIndex, currentDestIndex, currentBusType);
        int code = processPayment(lastScannedUID, fare, assignedSeat, walletBalance);
        Serial.print("Payment API code: "); Serial.println(code);

        if      (code == 200)             changeState(STATE_SUCCESS);
        else if (code == 402)             changeState(STATE_LOW_BALANCE);
        else if (code == 401 || code == 403) changeState(STATE_RFID_INVALID);
        else {
          showLCD("Pay Error:" + String(code), "Try Again");
          redLED(true);
          digitalWrite(BUZZER_PIN, HIGH); delay(2000); digitalWrite(BUZZER_PIN, LOW);
          delay(500); redLED(false);
          changeState(STATE_STANDBY);
        }
      }
      if (key == 'C') changeState(STATE_STANDBY);
      if (elapsedTime >= 25000) changeState(STATE_TIMEOUT);
      break;

    // ----------------------------------------
    // Walk-in payment success
    // ----------------------------------------
    case STATE_SUCCESS:
      if (stateJustChanged) {
        String line1 = (ticketCount > 1) ? (String(ticketCount) + " Seats Booked!") : ("Seat: " + assignedSeat);
        showLCD(line1, "Bal:Rs." + String(walletBalance));
        greenLED(true);
        buzzerValid();
        stateJustChanged = false;
      }
      if (elapsedTime >= 4000) { greenLED(false); changeState(STATE_STANDBY); }
      break;

    // ----------------------------------------
    // Low balance: RED LED + 2-sec long buzzer + "Not a valid balance"
    // ----------------------------------------
    case STATE_LOW_BALANCE:
      if (stateJustChanged) {
        showLCD("Not a valid", "balance!");
        redLED(true);
        buzzerInvalidLong(); // Turns buzzer ON (non-blocking)
        stateJustChanged = false;
      }
      if (elapsedTime >= 2000) {
        digitalWrite(BUZZER_PIN, LOW); // Turn buzzer OFF after 2 sec
        redLED(false);
        changeState(STATE_STANDBY);
      }
      break;

    // ----------------------------------------
    // Multiple tickets (group booking)
    // ----------------------------------------
    case STATE_MULTIPLE_BOOKING_PROMPT:
      if (stateJustChanged) {
        showLCD("No. of tickets?", "Press 1-9 then #");
        stateJustChanged = false;
      }
      if (key >= '1' && key <= '9') {
        ticketCount = key - '0';
        showLCD("Tickets: " + String(ticketCount), "# to confirm");
      }
      if (key == '#') changeState(STATE_WALKIN_PROMPT);
      if (key == 'C') changeState(STATE_STANDBY);
      if (elapsedTime >= 20000) changeState(STATE_TIMEOUT);
      break;

    // ----------------------------------------
    case STATE_CANCELLED:
      if (stateJustChanged) {
        showLCD("Cancelled", "Returning...");
        stateJustChanged = false;
      }
      if (elapsedTime >= 1500) changeState(STATE_STANDBY);
      break;

    // ----------------------------------------
    case STATE_TIMEOUT:
      if (stateJustChanged) {
        showLCD("Timeout!", "Returning...");
        stateJustChanged = false;
      }
      if (elapsedTime >= 1500) changeState(STATE_STANDBY);
      break;

    default:
      changeState(STATE_STANDBY);
      break;
  }
}