import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bus, Wifi, CreditCard, Shield, Zap, ChevronRight, ArrowRight,
  CheckCircle, Cpu, Smartphone, Cloud, Hash, LayoutDashboard
} from 'lucide-react';

const features = [
  { icon: CreditCard, title: 'RFID Fare Collection', desc: 'Tap-and-go automatic fare deduction using 13.56 MHz MFRC522 RFID cards' },
  { icon: Shield, title: 'Secure Digital Wallet', desc: 'Demo wallet for testing — ready for real payment integration' },
  { icon: Bus, title: 'Smart Bus Booking', desc: 'Book seats online before boarding. Get a digital ticket instantly' },
  { icon: Zap, title: 'ESP32 IoT Ready', desc: 'Designed to integrate with ESP32 + Firebase hardware seamlessly' },
  { icon: Smartphone, title: 'Mobile Friendly', desc: 'Fully responsive PWA — works on any phone or tablet' },
  { icon: LayoutDashboard, title: 'Admin Dashboard', desc: 'Complete admin panel with bus, passenger, and transaction management' },
];

const techStack = [
  { label: 'ESP32', desc: 'IoT Controller', icon: Cpu },
  { label: 'MFRC522', desc: '13.56 MHz RFID Reader', icon: Hash },
  { label: 'Firebase', desc: 'Cloud Database', icon: Cloud },
  { label: 'Wi-Fi', desc: 'Wireless Connectivity', icon: Wifi },
  { label: 'React PWA', desc: 'Web & Mobile App', icon: Smartphone },
];

const howItWorks = [
  { step: '01', title: 'Register & Set Up', desc: 'Create your account, link your RFID card, and add demo money to your wallet' },
  { step: '02', title: 'Book Your Bus', desc: 'Select source, destination, date and available bus. Fare is shown upfront' },
  { step: '03', title: 'RFID Authentication', desc: 'Tap your RFID card at the bus. ESP32 reads the UID and verifies with Firebase' },
  { step: '04', title: 'Automatic Fare Deduction', desc: 'Wallet balance is deducted automatically. Digital receipt generated instantly' },
];

const projectStatus = [
  { label: 'RFID System', status: 'Prototype', color: 'green' },
  { label: 'ESP32 Hardware', status: 'Prototype', color: 'green' },
  { label: 'Web Application', status: 'Active (Demo)', color: 'blue' },
  { label: 'Firebase', status: 'Ready to Connect', color: 'amber' },
  { label: 'Demo Wallet', status: 'Active', color: 'green' },
  { label: '4×4 Keypad', status: 'Integration Planned', color: 'gray' },
  { label: '16×2 LCD', status: 'Integration Planned', color: 'gray' },
  { label: 'GPS', status: 'NOT USED', color: 'red' },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* ===== NAVBAR ===== */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-primary-800 rounded-lg flex items-center justify-center">
                <Bus className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-primary-900">SMARTBUS</span>
                <span className="text-lg font-bold text-blue-500">+</span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
              <a href="#how-it-works" className="hover:text-primary-800 transition-colors">How It Works</a>
              <a href="#features" className="hover:text-primary-800 transition-colors">Features</a>
              <a href="#technology" className="hover:text-primary-800 transition-colors">Technology</a>
              <a href="#status" className="hover:text-primary-800 transition-colors">Status</a>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/login" className="btn-secondary btn-sm hidden sm:inline-flex">Login</Link>
              <Link to="/register" className="btn-primary btn-sm">Get Started</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="bg-gradient-to-br from-primary-900 via-primary-800 to-blue-700 text-white py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-1.5 text-sm text-blue-100 mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              AI-Enabled RFID Smart Bus System — Active System
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-balance">
              Travel Smarter.<br />
              <span className="text-blue-300">Book Faster.</span>
            </h1>
            <p className="mt-6 text-lg text-blue-100 max-w-2xl leading-relaxed">
              An IoT-enabled smart bus platform combining RFID authentication, digital booking,
              automatic fare collection and cloud-based transaction management using ESP32 & Firebase.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <button onClick={() => navigate('/register')} className="btn bg-white text-primary-900 hover:bg-blue-50 shadow-lg btn-lg font-semibold">
                Book a Bus
                <ArrowRight className="w-5 h-5" />
              </button>
              <button onClick={() => navigate('/login')} className="btn border border-white/30 text-white hover:bg-white/10 btn-lg">
                Login
              </button>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-sm text-blue-200">
              {[['SBP10001', 'Passenger ID Format'], ['A1B2C3D4', 'RFID UID Format'], ['₹0', 'Start Wallet Balance']].map(([val, label]) => (
                <div key={label}>
                  <div className="text-white font-bold text-lg">{val}</div>
                  <div>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== DEMO CREDENTIALS ===== */}
      <section className="bg-amber-50 border-y border-amber-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <span className="font-semibold text-amber-800 flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              Quick Demo Credentials:
            </span>
            <div className="flex flex-wrap gap-4">
              <span className="text-amber-700">Passenger: <code className="bg-amber-100 px-2 py-0.5 rounded font-mono">demo@smartbus.com</code> / <code className="bg-amber-100 px-2 py-0.5 rounded font-mono">demo123</code></span>
              <span className="text-amber-700">Admin: <code className="bg-amber-100 px-2 py-0.5 rounded font-mono">admin@smartbus.com</code> / <code className="bg-amber-100 px-2 py-0.5 rounded font-mono">admin123</code></span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">How SMARTBUS+ Works</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">A seamless end-to-end journey from booking to automatic fare collection</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item, i) => (
              <div key={item.step} className="relative">
                {i < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-primary-200 to-transparent z-0" />
                )}
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-primary-50 border-2 border-primary-100 rounded-2xl flex items-center justify-center mb-4">
                    <span className="text-2xl font-black text-primary-800">{item.step}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Platform Features</h2>
            <p className="text-gray-500 mt-3">Everything you need in a modern smart bus system</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card-hover p-6">
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary-700" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TECHNOLOGY ===== */}
      <section id="technology" className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Technology Stack</h2>
            <p className="text-gray-500 mt-3">Built on proven IoT and cloud technologies</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {techStack.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="card px-6 py-4 flex items-center gap-4 min-w-[200px]">
                <div className="w-10 h-10 bg-primary-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-gray-900">{label}</div>
                  <div className="text-xs text-gray-500">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Architecture diagram */}
          <div className="mt-12 card p-6 max-w-2xl mx-auto">
            <h3 className="font-semibold text-gray-900 mb-4 text-center">System Architecture (Current)</h3>
            <div className="flex items-center justify-center gap-2 flex-wrap text-sm">
              {['RFID Card', 'MFRC522', 'ESP32', 'Wi-Fi', 'Firebase', 'SMARTBUS+ Website'].map((item, i, arr) => (
                <React.Fragment key={item}>
                  <div className="px-3 py-1.5 bg-primary-50 border border-primary-200 rounded-lg text-primary-800 font-medium">{item}</div>
                  {i < arr.length - 1 && <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== PROJECT STATUS ===== */}
      <section id="status" className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Project Status</h2>
            <p className="text-gray-500 mt-3">Current development stage of each component</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {projectStatus.map(({ label, status, color }) => {
              const colorMap: Record<string, string> = {
                green: 'bg-green-50 border-green-200 text-green-700',
                blue: 'bg-blue-50 border-blue-200 text-blue-700',
                amber: 'bg-amber-50 border-amber-200 text-amber-700',
                gray: 'bg-gray-50 border-gray-200 text-gray-500',
                red: 'bg-red-50 border-red-200 text-red-600',
              };
              return (
                <div key={label} className={`rounded-lg border px-4 py-3 text-center ${colorMap[color]}`}>
                  <div className="text-xs font-bold uppercase tracking-wide">{status}</div>
                  <div className="text-sm font-semibold mt-1">{label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="bg-primary-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Try SMARTBUS+?</h2>
          <p className="text-blue-200 mb-8 max-w-xl mx-auto">Create your account and start using SMARTBUS+. Register as a passenger or contact an admin to get your RFID card linked.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/register" className="btn bg-white text-primary-900 hover:bg-blue-50 btn-lg font-semibold">
              Create Passenger Account
            </Link>
            <Link to="/login" className="btn border border-white/30 text-white hover:bg-white/10 btn-lg">
              Admin Login
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-800 rounded-lg flex items-center justify-center">
                <Bus className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold">SMARTBUS+</span>
            </div>
            <p className="text-sm text-center">
              AI-Enabled RFID Smart Bus System — ECE IoT Project
            </p>
            <div className="flex gap-4 text-sm">
              <Link to="/login" className="hover:text-white transition-colors">Login</Link>
              <Link to="/register" className="hover:text-white transition-colors">Register</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
