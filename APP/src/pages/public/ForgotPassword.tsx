import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bus, Mail, KeyRound, Lock, CheckCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

import { API_URL } from '../../config';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        toast.error(data.error || 'Failed to send OTP');
        return;
      }

      toast.success('Verification OTP code sent to your email!');
      setStep(2);
    } catch (err: any) {
      setLoading(false);
      toast.error('Failed to connect to backend server');
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        toast.error(data.error || 'Invalid OTP');
        return;
      }

      toast.success('OTP Verified successfully');
      setStep(3);
    } catch (err) {
      setLoading(false);
      toast.error('Failed to connect to backend server');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: newPassword })
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        toast.error(data.error || 'Failed to reset password');
        return;
      }

      toast.success('Password updated successfully!');
      navigate('/login');
    } catch (err) {
      setLoading(false);
      toast.error('Failed to connect to backend server');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="w-12 h-12 bg-primary-800 rounded-xl flex items-center justify-center">
              <Bus className="w-7 h-7 text-white" />
            </div>
            <div className="text-left">
              <div className="text-xl font-black text-primary-900">SMARTBUS<span className="text-blue-500">+</span></div>
              <div className="text-xs text-gray-500">Smart Bus System</div>
            </div>
          </Link>
        </div>

        <div className="card p-8 shadow-lg relative overflow-hidden">
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100">
            <div 
              className="h-full bg-primary-600 transition-all duration-300" 
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>

          {step === 1 && (
            <div className="animate-fade-in">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-primary-700" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Forgot Password?</h2>
              <p className="text-sm text-gray-500 mb-6">Enter your registered email address to receive a 6-digit OTP verification code.</p>
              
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label htmlFor="email" className="input-label">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input"
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                  {loading ? 'Sending...' : 'Send OTP'} <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </form>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                <KeyRound className="w-6 h-6 text-blue-700" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Verify OTP</h2>
              <p className="text-sm text-gray-500 mb-6">Enter the 6-digit code sent to <strong className="text-gray-700">{email}</strong></p>

              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <label htmlFor="otp" className="input-label">6-Digit OTP</label>
                  <input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="input text-center text-2xl tracking-widest font-mono font-bold"
                    placeholder="------"
                    required
                    maxLength={6}
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
                <button type="button" onClick={() => setStep(1)} className="w-full text-center text-sm text-gray-500 hover:text-gray-700 mt-2">
                  Change email address
                </button>
              </form>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-green-700" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Set New Password</h2>
              <p className="text-sm text-gray-500 mb-6">Create a new strong password for your account.</p>
              
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label htmlFor="new-pass" className="input-label">New Password</label>
                  <input
                    id="new-pass"
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="confirm-pass" className="input-label">Confirm Password</label>
                  <input
                    id="confirm-pass"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 bg-green-600 hover:bg-green-700 border-none">
                  {loading ? 'Resetting...' : 'Reset Password'} <CheckCircle className="w-4 h-4 ml-2" />
                </button>
              </form>
            </div>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            <Link to="/login" className="text-primary-700 font-medium hover:underline">Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
