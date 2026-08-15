# SMARTBUS+ — AI-Enabled RFID Smart Bus System

> 🚌 An IoT-enabled Smart Bus Booking & Automatic Fare Collection System built with ESP32, MFRC522 RFID, Firebase, and React.

[![Live Demo](https://img.shields.io/badge/Demo-Live-blue?style=flat-square)](http://localhost:5173)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)

---

## 📋 Table of Contents
- [Project Overview](#project-overview)
- [System Architecture](#system-architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Demo Credentials](#demo-credentials)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Firebase Integration](#firebase-integration)
- [Hardware Components](#hardware-components)

---

## 🎯 Project Overview

**SMARTBUS+** is an ECE IoT project prototype that combines:
- **RFID Authentication** — 13.56 MHz MFRC522-based card scanning
- **Automatic Fare Collection** — Wallet deduction on RFID tap
- **Online Bus Booking** — Web + Mobile responsive PWA
- **Admin Dashboard** — Full management of buses, passengers, and transactions
- **ESP32 Integration Ready** — Service layer designed for seamless hardware integration

> ⚠️ Currently runs in **DEMO MODE** — no real hardware required. Firebase & ESP32 integration is planned.

---

## 🏗️ System Architecture

```
Passenger Mobile/Web App
         ↓
    SMARTBUS+ Website (React PWA)
         ↓
    Firebase (Planned)
         ↓
    ESP32 (on bus)
         ↓
    MFRC522 RFID Reader
         ↓
    RFID Card (13.56 MHz)
```

---

## ✨ Features

### 🧑‍💼 Passenger Portal
| Feature | Status |
|---------|--------|
| Register / Login / Forgot Password | ✅ Active |
| Book Bus (Source → Destination) | ✅ Active |
| Digital Ticket with print/save | ✅ Active |
| Demo Wallet (Add/Spend/Refund) | ✅ Active |
| RFID Card Link / Unlink | ✅ Active |
| Simulate RFID Scan | ✅ Active |
| Transaction History | ✅ Active |
| Profile Management | ✅ Active |

### 🔧 Admin Panel
| Feature | Status |
|---------|--------|
| Admin Dashboard with Charts | ✅ Active |
| Bus CRUD (Add/Edit/Delete) | ✅ Active |
| Route Management | ✅ Active |
| Passenger Management | ✅ Active |
| RFID Card Management | ✅ Active |
| Booking Monitoring | ✅ Active |
| Transaction Monitoring | ✅ Active |
| ESP32 Device Dashboard | ✅ Demo |
| System Logs | ✅ Active |
| Demo/Hardware Mode Toggle | ✅ Active |

### 📱 Mobile Support
- ✅ Progressive Web App (PWA) — installable on Android/iOS
- ✅ Fully responsive (mobile sidebar drawer)
- ✅ Touch-optimized UI

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend Framework | React 18 + TypeScript |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS 3 |
| Routing | React Router v6 |
| Charts | Recharts |
| Icons | Lucide React |
| Notifications | React Hot Toast |
| Auth/DB | Firebase (planned) / localStorage (demo) |
| PWA | Web App Manifest |

### Hardware (Prototype)
| Component | Purpose |
|-----------|---------|
| ESP32 | IoT controller + Wi-Fi |
| MFRC522 | 13.56 MHz RFID reader |
| 4×4 Matrix Keypad | Walk-in destination selection |
| 16×2 I2C LCD | Status display |
| Green/Red LED | Access feedback |
| Piezo Buzzer | Audio feedback |

---

## 🔐 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| 🧑 Passenger | `demo@smartbus.com` | `demo123` |
| 🔧 Admin | `admin@smartbus.com` | `admin123` |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+ (v20.x recommended)
- npm 10+

### Installation

```bash
# Clone the repository
git clone https://github.com/Tamil01-star/Smart-RFID-Booking-System.git
cd Smart-RFID-Booking-System/APP

# Install dependencies
npm install

# Start development server
npm run dev
```

Open **http://localhost:5173** in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

---

## 📁 Project Structure

```
APP/
├── public/
│   ├── manifest.json          # PWA manifest
│   └── bus-icon.svg           # App icon
├── src/
│   ├── types/index.ts         # TypeScript interfaces
│   ├── data/mockData.ts       # Demo data (Tamil Nadu routes)
│   ├── context/
│   │   ├── AuthContext.tsx    # Authentication state
│   │   └── AppContext.tsx     # App settings (demo/hardware mode)
│   ├── services/index.ts      # Firebase-ready service layer
│   └── pages/
│       ├── public/            # Home, Login, Register, ForgotPassword
│       ├── passenger/         # Dashboard, BookBus, MyTickets, Wallet,
│       │                        RFIDManagement, TransactionHistory, Profile
│       └── admin/             # AdminDashboard, BusManagement, RouteManagement,
│                                PassengerManagement, AdminRFIDManagement,
│                                BookingManagement, TransactionMonitoring,
│                                ESP32Devices, SystemLogs, Settings
└── index.html
```

---

## 🔥 Firebase Integration (Planned)

The service layer in `src/services/index.ts` is structured for easy Firebase integration:

```typescript
// Currently uses localStorage (demo mode)
// Replace with Firebase calls:

busService.getBuses()          → getDocs(collection(db, 'buses'))
walletService.getWallet()      → getDoc(doc(db, 'wallets', passengerId))
bookingService.createBooking() → addDoc(collection(db, 'bookings'), data)
rfidService.linkCard()         → setDoc(doc(db, 'rfidCards', uid), data)
```

### Firestore Collections
```
users/           rfidCards/        buses/
wallets/         bookings/         routes/
walletTransactions/               fareTransactions/
devices/         systemLogs/
```

---

## ⚙️ Hardware Components

### Wiring (ESP32)
| Component | ESP32 Pin |
|-----------|-----------|
| MFRC522 SDA | GPIO 5 |
| MFRC522 SCK | GPIO 18 |
| MFRC522 MOSI | GPIO 23 |
| MFRC522 MISO | GPIO 19 |
| MFRC522 RST | GPIO 22 |
| LCD SDA | GPIO 21 |
| LCD SCL | GPIO 22 |
| Green LED | GPIO 2 |
| Red LED | GPIO 4 |
| Buzzer | GPIO 15 |

---

## 🛣️ Demo Routes

| Bus | Route | Fare |
|-----|-------|------|
| BUS-101 | Salem → Chennai | ₹120 |
| BUS-102 | Salem → Coimbatore | ₹80 |
| BUS-103 | Salem → Trichy | ₹100 |
| BUS-104 | Chennai → Madurai | ₹150 |
| BUS-105 | Chennai → Bangalore | ₹200 |
| BUS-106 | Chennai → Pondicherry | ₹90 |

---

## 📌 Project Status

| Component | Status |
|-----------|--------|
| Web Application (React PWA) | ✅ Active — Demo Mode |
| RFID System (MFRC522) | 🔧 Prototype |
| ESP32 Firmware | 🔧 Prototype |
| Firebase Integration | 📋 Planned |
| 4×4 Keypad Integration | 📋 Planned |
| 16×2 LCD Integration | 📋 Planned |
| GPS | ❌ NOT USED |

---

## 🎓 Academic Information

- **Project:** ECE IoT Department Project
- **Title:** AI-Enabled RFID Smart Bus Reservation & Automatic Fare Collection System
- **Stack:** ESP32 + MFRC522 + Firebase + React PWA

---

## 📄 License

This project is for academic/educational purposes.

---

<div align="center">
  Built with ❤️ by Tamil — SMARTBUS+ ECE IoT Project
</div>
