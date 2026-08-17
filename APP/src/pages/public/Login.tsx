import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bus, Eye, EyeOff, AlertCircle, CreditCard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login, loginWithRFID } = useAuth();
  const navigate = useNavigate();
  const [loginMethod, setLoginMethod] = useState<'email' | 'rfid'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rfidUid, setRfidUid] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    let result;
    if (loginMethod === 'email') {
      result = await login(email.trim(), password);
    } else {
      result = await loginWithRFID(rfidUid.trim().toUpperCase(), password);
    }

    setLoading(false);
    if (result.success) {
      toast.success('Welcome back!');
      // navigation handled by App.tsx redirect
    } else {
      setError(result.error || 'Login failed. Please try again.');
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
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

        <div className="card p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">Sign in to your SMARTBUS+ account</p>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
            <button
              onClick={() => setLoginMethod('email')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${loginMethod === 'email' ? 'bg-white text-primary-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Email & Password
            </button>
            <button
              onClick={() => setLoginMethod('rfid')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${loginMethod === 'rfid' ? 'bg-white text-primary-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              RFID Card
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {loginMethod === 'email' ? (
              <>
                <div>
                  <label htmlFor="email" className="input-label">Email Address / Username</label>
                  <input
                    id="email"
                    type="text"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input"
                    placeholder="you@example.com or username"
                    required
                    autoComplete="username"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="input-label mb-0">Password</label>
                    <Link to="/forgot-password" className="text-xs text-primary-700 hover:underline">Forgot password?</Link>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="input pr-10"
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-5">
                <div>
                  <label htmlFor="rfid" className="input-label">RFID Card Number (UID)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CreditCard className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="rfid"
                      type="text"
                      value={rfidUid}
                      onChange={e => setRfidUid(e.target.value)}
                      className="input pl-10"
                      placeholder="e.g. A1B2C3D4"
                      required
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Demo Card UID: <button type="button" onClick={() => { setRfidUid('A1B2C3D4'); setPassword('demo123'); }} className="font-semibold text-primary-600 hover:underline">A1B2C3D4</button>
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="rfid-password" className="input-label mb-0">Password (Phone Number)</label>
                    <Link to="/forgot-password" className="text-xs text-primary-700 hover:underline">Forgot password?</Link>
                  </div>
                  <div className="relative">
                    <input
                      id="rfid-password"
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="input pr-10"
                      placeholder="••••••••"
                      required
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-700 font-medium hover:underline">Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
