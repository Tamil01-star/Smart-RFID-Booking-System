Project Title

SMARTBUS+

AI Enabled RFID Smart Bus Reservation & Automatic Fare Collection System with AI Passenger Monitoring and Smart Analytics
Goal

Create a complete futuristic engineering prototype of an AI-powered Smart Bus Ticket System.

The project should look like a real commercial product that can be deployed in cities.

The project must include

Mobile Application
ESP32 Hardware
RFID Authentication
AI Camera
Cloud Database
Wallet Payment
GPS Tracking
Admin Dashboard
AI Chatbot
Passenger Analytics
AI Prediction

Everything should work together.

The design should be modern with blue and white UI.

Problem Statement

Public buses currently have many problems.

• Long queues

• Cash handling

• Ticket fraud

• Fake tickets

• Wrong bus boarding

• Manual passenger counting

• No real-time occupancy

• No automatic payment

• No passenger prediction

• No intelligent monitoring

• No AI assistant

The objective is to solve all these using AI, ESP32, RFID, Cloud and Mobile Application.

Complete System Architecture

The complete system contains

Passenger

↓

Mobile App

↓

Cloud Database

↓

ESP32 inside Bus

↓

RFID Reader

↓

AI Camera

↓

Servo Door

↓

OLED Display

↓

GPS Module

↓

Admin Dashboard

↓

Cloud Analytics

Mobile Application

Create a professional Flutter Android Application.

The application should contain

Login

Registration

OTP Verification

Mobile Number Login

Wallet

Book Ticket

Available Buses

Bus Timing

Seat Availability

Ticket Price

Bus Location

Current Crowd

Arrival Time

Journey History

Wallet Recharge

Monthly Pass

Student Pass

Notifications

Ratings

Emergency SOS

AI Chatbot

Dark Mode

Google Maps

QR Backup Ticket

RFID Card Registration

AI Chatbot

The app contains a small AI Assistant.

Passengers can ask

"When is my bus?"

"What is my ticket?"

"Which bus is less crowded?"

"How much money is in my wallet?"

"Show my booking."

"Nearest bus stop."

"Best route."

"Why was my RFID rejected?"

The chatbot should answer intelligently using AI.

Booking Process

User opens app.

↓

Login using Mobile Number.

↓

OTP Verification.

↓

Dashboard opens.

↓

Choose Source.

↓

Choose Destination.

↓

Choose Date.

↓

Choose Bus.

↓

View Fare.

↓

View Seat Availability.

↓

View Current Crowd.

↓

Book Ticket.

↓

Money deducted from Wallet.

↓

Booking stored in Firebase.

↓

RFID Card linked with booking.

↓

Digital Ticket Generated.

Bus Boarding

Passenger reaches bus.

↓

RFID Card tapped.

↓

MFRC522 reads UID.

↓

ESP32 receives UID.

↓

ESP32 connects to Firebase using WiFi.

↓

Firebase checks

Booking exists?

Correct bus?

Correct timing?

Wallet Balance?

Booking expired?

Already travelled?

↓

If all true

Access Granted

↓

Servo Door Opens

↓

OLED shows

Welcome

Passenger Name

Bus Number

Seat Number

Destination

↓

Buzzer OFF

↓

Auto Pay Activated

↓

Journey Started

↓

Passenger Count Updated

↓

Camera verifies entry

↓

Admin Dashboard updated

If Wrong Bus

RFID scanned.

↓

Firebase detects wrong bus.

↓

Door remains locked.

↓

OLED displays

Wrong Bus

↓

Buzzer ON

↓

Notification sent to passenger

↓

Suggest correct bus

If No Booking

RFID scanned.

↓

Booking not found.

↓

Door Locked.

↓

Buzzer ON.

↓

OLED

No Booking Found

If Wallet Balance Low

RFID scanned.

↓

Booking available.

↓

Wallet insufficient.

↓

OLED

Recharge Wallet

↓

Door remains locked.

↓

App Notification

Automatic Fare Collection

The system uses AutoPay.

Passenger books.

↓

Money blocked in wallet.

↓

Passenger boards.

↓

RFID verified.

↓

Journey starts.

↓

Fare automatically deducted.

↓

Digital receipt generated.

Refund System

Passenger booked.

↓

Passenger never boarded.

↓

Booking expires.

↓

AI verifies passenger absent.

↓

Automatic Refund.

↓

Wallet updated.

↓

Notification sent.

AI Camera Module

Install ESP32-CAM.

The AI camera continuously monitors

Passenger Count

Standing Passengers

Empty Seats

Unauthorized Entry

Suspicious Activity

Door Area

Crowd Density

The AI model should detect humans.

Use

YOLO

or

TensorFlow Lite

or

Edge Impulse

for person detection.

AI Passenger Counting

Camera counts every passenger.

Current Count

Maximum Capacity

Available Seats

Standing Count

Occupancy %

Example

Capacity

50

Current

38

Occupancy

76%

Display in app.

Display in Admin Dashboard.

Unauthorized Passenger Detection

Camera continuously checks.

If passenger enters without RFID scan

↓

AI detects mismatch.

↓

ESP32 compares

Camera Count

vs

RFID Count

If

Camera Count > RFID Count

↓

Unauthorized passenger detected.

↓

Buzzer ON

↓

LED Red

↓

Driver Notification

↓

Admin Alert

↓

Image saved in Cloud

AI Crowd Prediction

Using previous data,

AI predicts

Morning Rush

Evening Rush

Festival Crowds

Weekend Traffic

School Timing

College Timing

Peak Hours

Display

Low Crowd

Medium Crowd

High Crowd

Passengers can choose less crowded buses.

AI Route Recommendation

AI suggests

Fastest Bus

Cheapest Bus

Less Crowded Bus

Nearest Stop

Alternate Route

Shortest Travel Time

GPS Tracking

Each bus contains GPS.

The app displays

Current Bus Location

Estimated Arrival

Next Stop

Speed

Remaining Distance

Travel Time

Smart Notifications

Bus arriving

5 minutes left

Board now

Low Wallet Balance

Journey Started

Journey Completed

Refund Completed

Wrong Bus

Emergency Alert

Admin Dashboard

Professional Web Dashboard

Display

Total Passengers

Revenue

Active Buses

Refunds

Daily Tickets

Occupancy

Bus Health

Alerts

Unauthorized Passengers

Live GPS

Passenger Trends

Heat Maps

Crowd Analysis

AI Reports

Hardware Components

ESP32

MFRC522 RFID Reader

ESP32-CAM

Servo Motor

OLED Display

GPS Module NEO-6M

Buzzer

LED

Power Supply

WiFi

Firebase

Cloud Functions

Software Stack

Flutter

Firebase

Firestore

Firebase Authentication

Firebase Cloud Messaging

ESP-IDF / Arduino IDE

Google Maps API

TensorFlow Lite

OpenCV

YOLO

Python AI Server (optional)

Cloud Functions

Database Structure

Users

Wallet

RFID UID

Bookings

Buses

Drivers

Passenger Count

Routes

Payments

Notifications

Refunds

Journey History

AI Analytics

Camera Logs

Unauthorized Events

AI Innovations
AI Passenger Counting
AI Unauthorized Passenger Detection
AI Crowd Prediction
AI Smart Route Recommendation
AI Chatbot
AI Fraud Detection
AI Occupancy Prediction
AI Delay Prediction
AI Emergency Detection
AI Driver Behaviour Monitoring
AI Face Recognition (Future Upgrade)
AI Lost Item Detection
AI Passenger Sentiment Analysis
AI Dynamic Ticket Pricing
AI Predictive Bus Maintenance
AI Fuel Efficiency Monitoring
AI Carbon Emission Analytics
AI Smart Seat Allocation
AI Voice Assistant
AI Smart City Integration
Future Scope

• UPI AutoPay

• NFC Mobile Ticket

• Face Recognition Ticket

• Aadhaar Verification

• Smart City Integration

• Electric Bus Monitoring

• Metro Integration

• Railway Integration

• AI Voice Booking

• Multi-language Assistant

• Digital Twin Dashboard

• Predictive Maintenance

• Carbon Footprint Tracking

System Workflow
Mobile App
      │
      ▼
User Login
      │
      ▼
Book Ticket
      │
      ▼
Wallet Reserved
      │
      ▼
Firebase
      │
      ▼
RFID Scan
      │
      ▼
ESP32 Authentication
      │
      ▼
AI Camera Verification
      │
      ├── Passenger Count
      ├── Unauthorized Detection
      ├── Crowd Analysis
      ▼
Door Unlock
      │
      ▼
Auto Fare Deduction
      │
      ▼
Journey Tracking
      │
      ▼
Admin Dashboard
      │
      ▼
AI Analytics
Extra Innovation (to impress examiners)

One feature that can make your project stand out is AI-based RFID mismatch detection. The ESP32 receives the RFID authentication count, while the ESP32-CAM runs an AI model to count people entering. If the camera detects more people than successful RFID scans, the system immediately identifies a possible fare evasion, sounds the buzzer, captures an image, alerts the driver, and logs the event in the cloud. This is a practical AI application that goes beyond a typical RFID ticketing project.