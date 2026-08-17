import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ==================== Mail Transporter helper ====================
const createTransporter = async () => {
  // If SMTP config exists, use it
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  
  // Fallback: Create test account on Ethereal Email for testing
  try {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  } catch (err) {
    console.warn("Could not create mock email transporter, falling back to console logging.");
    return null;
  }
};

const sendEmail = async (to: string, subject: string, text: string, html: string) => {
  const transporter = await createTransporter();
  const from = process.env.SMTP_FROM || 'noreply@smartbus.com';
  
  if (transporter) {
    try {
      const info = await transporter.sendMail({ from, to, subject, text, html });
      const url = nodemailer.getTestMessageUrl(info);
      if (url) {
        console.log(`📩 [Ethereal Mail] Preview URL: ${url}`);
      } else {
        console.log(`📩 Email sent to ${to}`);
      }
      return true;
    } catch (err) {
      console.error("Failed to send email via transporter:", err);
    }
  }
  
  // Fallback: Just log it
  console.log(`📩 [CONSOLE MAIL LOGGER]\nTo: ${to}\nSubject: ${subject}\nContent: ${text}\n`);
  return true;
};

// ==================== LOGGING HELPER ====================
const logEvent = async (level: string, message: string, source: string, details?: string) => {
  try {
    await prisma.systemLog.create({
      data: { level, message, source, details }
    });
  } catch (err) {
    console.error("Failed to write system log to DB:", err);
  }
};

// ==================== AUTH ROUTES ====================

app.post('/api/auth/register', async (req, res) => {
  const { name, email, phone, category } = req.body;
  try {
    // Basic validations
    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] }
    });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email or phone number already exists' });
    }

    // Hash phone number as default password
    const hashedPassword = await bcrypt.hash(phone, 10);
    const passengerId = `SBP${Date.now().toString().slice(-5)}`;

    // Create user and wallet in a transaction
    const [user, wallet] = await prisma.$transaction([
      prisma.user.create({
        data: {
          name,
          email,
          phone,
          passengerId,
          role: 'passenger',
          category: category || 'general',
          password: hashedPassword,
        }
      }),
      prisma.wallet.create({
        data: {
          passengerId,
          balance: 0.0,
        }
      })
    ]);

    await logEvent('success', `New passenger registration: ${passengerId} (${name})`, 'Auth Service');
    
    // Send welcome email
    await sendEmail(
      email, 
      'Welcome to SMARTBUS+',
      `Welcome ${name}! Your passenger ID is ${passengerId}. Your default password is your phone number.`,
      `<h3>Welcome to SMARTBUS+</h3><p>Hello <b>${name}</b>,</p><p>Your passenger account has been registered successfully.</p><p><b>Passenger ID:</b> ${passengerId}<br/><b>Default Password:</b> ${phone}</p><p>Safe travels!</p>`
    );

    res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, passengerId, role: user.role } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // 1. Check Admin environment overrides first
    const adminEmail = process.env.VITE_ADMIN_EMAIL || 'admin@smartbus.com';
    const adminPass = process.env.VITE_ADMIN_PASSWORD || 'admin123';
    const vertexId = process.env.VITE_VERTEX_ID || 'vertex';
    const vertexPass = process.env.VITE_VERTEX_PASSWORD || 'vertex@01';

    if (email.toLowerCase() === adminEmail.toLowerCase() && password === adminPass) {
      return res.json({
        success: true,
        user: { id: 'admin-001', name: 'Admin', email: adminEmail, passengerId: 'SBA001', role: 'admin' }
      });
    }

    if (email.toLowerCase() === vertexId.toLowerCase() && password === vertexPass) {
      return res.json({
        success: true,
        user: { id: 'admin-002', name: 'Vertex Admin', email: 'vertex@admin.com', passengerId: 'SBA002', role: 'admin' }
      });
    }

    // 2. Check Database Users
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { passengerId: email.toUpperCase() }
        ]
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'No account found with this email or passenger ID.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid password. Try your phone number as default.' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        passengerId: user.passengerId,
        role: user.role,
        category: user.category,
        rfidUid: user.rfidUid,
        status: user.status
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login-rfid', async (req, res) => {
  const { uid, password } = req.body;
  try {
    if (!uid || !password) {
      return res.status(400).json({ error: 'RFID UID and password are required' });
    }

    const card = await prisma.rFIDCard.findFirst({
      where: { uid: uid.toUpperCase(), status: 'active' }
    });

    if (!card || !card.passengerId) {
      return res.status(400).json({ error: 'Invalid or unregistered RFID card.' });
    }

    const user = await prisma.user.findFirst({
      where: { passengerId: card.passengerId }
    });

    if (!user) {
      return res.status(400).json({ error: 'User associated with this card not found.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect password for this RFID card.' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        passengerId: user.passengerId,
        role: user.role,
        category: user.category,
        rfidUid: user.rfidUid,
        status: user.status
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/send-otp', async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const user = await prisma.user.findFirst({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email address' });
    }

    // Generate 6 digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry

    // Save in database
    await prisma.oTP.create({
      data: {
        email: email.toLowerCase(),
        code,
        expiresAt
      }
    });

    // Send email
    await sendEmail(
      email,
      'SMARTBUS+ OTP Verification',
      `Your verification code is ${code}. It expires in 10 minutes.`,
      `<h3>SMARTBUS+ Verification</h3><p>Hello,</p><p>You requested an OTP to reset your password.</p><p>Your verification code is: <b style="font-size: 20px; letter-spacing: 2px;">${code}</b></p><p>This code will expire in 10 minutes.</p>`
    );

    res.json({ success: true, message: 'OTP sent to email' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  try {
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const verification = await prisma.oTP.findFirst({
      where: {
        email: email.toLowerCase(),
        code: otp,
        expiresAt: { gte: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!verification) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    res.json({ success: true, message: 'OTP Verified' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and new password are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    await prisma.user.updateMany({
      where: { email: email.toLowerCase() },
      data: { password: hashedPassword }
    });

    await logEvent('info', `Password reset successful for ${email}`, 'Auth Service');

    res.json({ success: true, message: 'Password reset successful' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== USER PROFILE / ADMIN ROUTES ====================

app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/update/:userId', async (req, res) => {
  const { userId } = req.params;
  const { name, phone } = req.body;
  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { name, phone }
    });
    res.json({ success: true, user: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/delete/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Delete bookings, transactions, wallet, and rfid card associated
    await prisma.$transaction([
      prisma.booking.deleteMany({ where: { passengerId: user.passengerId } }),
      prisma.walletTransaction.deleteMany({ where: { passengerId: user.passengerId } }),
      prisma.wallet.deleteMany({ where: { passengerId: user.passengerId } }),
      prisma.rFIDCard.deleteMany({ where: { passengerId: user.passengerId } }),
      prisma.user.delete({ where: { id: userId } })
    ]);

    await logEvent('warning', `Deleted account permanently: ${user.passengerId} (${user.name})`, 'Auth Service');
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== BUS MANAGEMENT ====================

app.get('/api/buses', async (req, res) => {
  try {
    const buses = await prisma.bus.findMany();
    res.json(buses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/buses', async (req, res) => {
  const busData = req.body;
  try {
    const bus = await prisma.bus.create({
      data: {
        busNumber: busData.busNumber,
        busName: busData.busName,
        source: busData.source,
        destination: busData.destination,
        departureTime: busData.departureTime,
        arrivalTime: busData.arrivalTime,
        fare: Number(busData.fare),
        totalSeats: Number(busData.totalSeats || 40),
        availableSeats: Number(busData.availableSeats || 40),
        status: busData.status || 'active',
        route: busData.route,
        stopsWithFares: busData.stopsWithFares || [],
      }
    });
    res.json(bus);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/buses/:id', async (req, res) => {
  const { id } = req.params;
  const busData = req.body;
  try {
    const bus = await prisma.bus.update({
      where: { id },
      data: {
        busNumber: busData.busNumber,
        busName: busData.busName,
        source: busData.source,
        destination: busData.destination,
        departureTime: busData.departureTime,
        arrivalTime: busData.arrivalTime,
        fare: busData.fare !== undefined ? Number(busData.fare) : undefined,
        totalSeats: busData.totalSeats !== undefined ? Number(busData.totalSeats) : undefined,
        availableSeats: busData.availableSeats !== undefined ? Number(busData.availableSeats) : undefined,
        status: busData.status,
        route: busData.route,
        stopsWithFares: busData.stopsWithFares || [],
      }
    });
    res.json(bus);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/buses/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.bus.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== WALLET & TRANSACTIONS ====================

app.get('/api/wallet/:passengerId', async (req, res) => {
  const { passengerId } = req.params;
  try {
    let wallet = await prisma.wallet.findUnique({ where: { passengerId } });
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { passengerId, balance: 0.0 }
      });
    }
    res.json(wallet);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wallet/add-money', async (req, res) => {
  const { passengerId, amount } = req.body;
  try {
    let wallet = await prisma.wallet.findUnique({ where: { passengerId } });
    if (!wallet) {
      wallet = await prisma.wallet.create({ data: { passengerId, balance: 0.0 } });
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + Number(amount);

    // Update wallet
    const updatedWallet = await prisma.wallet.update({
      where: { passengerId },
      data: { balance: balanceAfter }
    });

    // Create transaction log
    await prisma.walletTransaction.create({
      data: {
        passengerId,
        type: 'ADD_MONEY',
        amount: Number(amount),
        description: 'Money added to wallet',
        balanceBefore,
        balanceAfter,
        status: 'success'
      }
    });

    await logEvent('success', `Wallet updated: ₹${amount} added for ${passengerId}`, 'Wallet Service');

    res.json(updatedWallet);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/transactions', async (req, res) => {
  const { passengerId } = req.query;
  try {
    const txns = await prisma.walletTransaction.findMany({
      where: passengerId ? { passengerId: String(passengerId) } : {},
      orderBy: { timestamp: 'desc' }
    });
    res.json(txns);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== BOOKING ROUTES ====================

app.get('/api/bookings', async (req, res) => {
  const { passengerId } = req.query;
  try {
    const bookings = await prisma.booking.findMany({
      where: passengerId ? { passengerId: String(passengerId) } : {},
      orderBy: { createdAt: 'desc' }
    });
    res.json(bookings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookings/create', async (req, res) => {
  const { passengerId, passengerName, busId, travelDate, rfidUid } = req.body;
  try {
    const bus = await prisma.bus.findUnique({ where: { id: busId } });
    if (!bus) return res.status(404).json({ error: 'Bus not found' });
    if (bus.availableSeats <= 0) return res.status(400).json({ error: 'Bus is full' });

    // Deduct fare from wallet
    let wallet = await prisma.wallet.findUnique({ where: { passengerId } });
    if (!wallet || wallet.balance < bus.fare) {
      // Record failed transaction log
      await prisma.walletTransaction.create({
        data: {
          passengerId,
          type: 'FARE_DEDUCTION',
          amount: bus.fare,
          description: `Fare deduction failed: Insufficient balance for ${bus.busNumber}`,
          balanceBefore: wallet ? wallet.balance : 0.0,
          balanceAfter: wallet ? wallet.balance : 0.0,
          status: 'failed',
          busNumber: bus.busNumber,
          rfidUid
        }
      });
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - bus.fare;

    // Deduct fare & update seats
    await prisma.$transaction([
      prisma.wallet.update({ where: { passengerId }, data: { balance: balanceAfter } }),
      prisma.bus.update({ where: { id: busId }, data: { availableSeats: bus.availableSeats - 1 } }),
      prisma.walletTransaction.create({
        data: {
          passengerId,
          type: 'FARE_DEDUCTION',
          amount: bus.fare,
          description: `Bus fare ticket booking - ${bus.busNumber}`,
          balanceBefore,
          balanceAfter,
          status: 'success',
          busNumber: bus.busNumber,
          rfidUid
        }
      })
    ]);

    const bookingId = `SBBK${Math.floor(10000000 + Math.random() * 90000000)}`;
    const booking = await prisma.booking.create({
      data: {
        bookingId,
        passengerId,
        passengerName,
        busId,
        busNumber: bus.busNumber,
        source: bus.source,
        destination: bus.destination,
        travelDate,
        departureTime: bus.departureTime,
        arrivalTime: bus.arrivalTime,
        fare: bus.fare,
        status: 'confirmed',
        rfidUid,
        rfidLinked: !!rfidUid
      }
    });

    await logEvent('success', `Booking ${bookingId} confirmed for ${passengerName}`, 'Booking Service');

    res.json({ success: true, booking });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookings/cancel/:bookingId', async (req, res) => {
  const { bookingId } = req.params;
  const { passengerId } = req.body;
  try {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'confirmed') return res.status(400).json({ error: 'Only confirmed bookings can be cancelled' });

    // Cancel booking, refund fare, add back seats
    const wallet = await prisma.wallet.findUnique({ where: { passengerId } });
    const bus = await prisma.bus.findUnique({ where: { id: booking.busId } });

    const balanceBefore = wallet ? wallet.balance : 0.0;
    const balanceAfter = balanceBefore + booking.fare;

    await prisma.$transaction([
      prisma.booking.update({ where: { id: bookingId }, data: { status: 'cancelled' } }),
      prisma.wallet.update({ where: { passengerId }, data: { balance: balanceAfter } }),
      prisma.walletTransaction.create({
        data: {
          passengerId,
          type: 'REFUND',
          amount: booking.fare,
          description: `Refund for cancelled booking: ${booking.bookingId}`,
          balanceBefore,
          balanceAfter,
          status: 'success'
        }
      }),
      prisma.bus.update({
        where: { id: booking.busId },
        data: { availableSeats: bus ? bus.availableSeats + 1 : 40 }
      })
    ]);

    await logEvent('warning', `Booking ${booking.bookingId} cancelled by passenger`, 'Booking Service');

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== RFID CARD ROUTES ====================

app.get('/api/rfid', async (req, res) => {
  try {
    const cards = await prisma.rFIDCard.findMany();
    res.json(cards);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rfid/:passengerId', async (req, res) => {
  const { passengerId } = req.params;
  try {
    const card = await prisma.rFIDCard.findFirst({ where: { passengerId } });
    res.json(card);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rfid/link', async (req, res) => {
  const { uid, passengerId, passengerName } = req.body;
  try {
    // Check if UID is already linked
    const existing = await prisma.rFIDCard.findFirst({
      where: { uid, passengerId: { not: passengerId }, status: 'active' }
    });
    if (existing) {
      return res.status(400).json({ error: 'This RFID card is already linked to another passenger' });
    }

    // Check if passenger already has linked card
    const passengerCard = await prisma.rFIDCard.findFirst({
      where: { passengerId, status: 'active' }
    });
    if (passengerCard && passengerCard.uid !== uid) {
      return res.status(400).json({ error: 'You already have an RFID card linked. Unlink it first.' });
    }

    // Save linked card
    const card = await prisma.rFIDCard.upsert({
      where: { uid },
      update: { passengerId, passengerName, status: 'active', linkedAt: new Date() },
      create: { uid, passengerId, passengerName, status: 'active' }
    });

    // Save in user profile
    await prisma.user.updateMany({
      where: { passengerId },
      data: { rfidUid: uid }
    });

    await logEvent('success', `RFID card ${uid} successfully linked to ${passengerId}`, 'RFID Service');

    res.json({ success: true, card });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rfid/unlink', async (req, res) => {
  const { passengerId } = req.body;
  try {
    await prisma.rFIDCard.updateMany({
      where: { passengerId },
      data: { passengerId: '', passengerName: '', status: 'inactive' }
    });

    await prisma.user.updateMany({
      where: { passengerId },
      data: { rfidUid: null }
    });

    await logEvent('warning', `RFID card unlinked for passenger ${passengerId}`, 'RFID Service');

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ESP32 HW SCAN ENDPOINT ====================

app.post('/api/esp32/scan', async (req, res) => {
  const { uid, busNumber } = req.body;
  try {
    if (!uid || !busNumber) {
      return res.status(400).json({ error: 'RFID UID and Bus Number are required' });
    }

    const card = await prisma.rFIDCard.findFirst({ where: { uid, status: 'active' } });
    if (!card || !card.passengerId) {
      await logEvent('error', `Hardware scan failed: Unregistered RFID Card ${uid}`, 'ESP32 Device Listener');
      return res.json({ status: 'error', code: 'UNREGISTERED', message: 'Card not registered' });
    }

    // Find booking
    const booking = await prisma.booking.findFirst({
      where: { passengerId: card.passengerId, busNumber, status: 'confirmed' }
    });

    if (!booking) {
      await logEvent('error', `Hardware scan failed: No booking found for passenger ${card.passengerId} on ${busNumber}`, 'ESP32 Device Listener');
      return res.json({ status: 'error', code: 'NO_BOOKING', message: 'No valid booking found' });
    }

    // Verify wallet balance
    const wallet = await prisma.wallet.findUnique({ where: { passengerId: card.passengerId } });
    if (!wallet || wallet.balance < booking.fare) {
      return res.json({ status: 'error', code: 'LOW_BALANCE', message: 'Low balance' });
    }

    // Success! Deduct fare
    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - booking.fare;

    await prisma.$transaction([
      prisma.wallet.update({ where: { passengerId: card.passengerId }, data: { balance: balanceAfter } }),
      prisma.booking.update({ where: { id: booking.id }, data: { status: 'completed', rfidUid: uid, rfidLinked: true } }),
      prisma.rFIDCard.update({ where: { uid }, data: { lastUsedAt: new Date() } }),
      prisma.walletTransaction.create({
        data: {
          passengerId: card.passengerId,
          type: 'WALK_IN_FARE',
          amount: booking.fare,
          description: `Fare boarding scan - ${busNumber}`,
          balanceBefore,
          balanceAfter,
          status: 'success',
          busNumber,
          rfidUid: uid
        }
      })
    ]);

    await logEvent('success', `RFID scan success: Passenger ${card.passengerId} checked in on ${busNumber}`, 'ESP32 Device Listener');

    res.json({
      status: 'success',
      code: 'OK',
      passengerName: card.passengerName,
      fare: booking.fare,
      newBalance: balanceAfter
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== SYSTEM LOG AUDITS ====================

app.get('/api/logs', async (req, res) => {
  try {
    const logs = await prisma.systemLog.findMany({ orderBy: { timestamp: 'desc' } });
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
