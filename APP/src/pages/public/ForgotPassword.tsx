import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bus, Mail, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
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

        <div className="card p-8 shadow-lg">
          {!sent ? (
            <>
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-primary-700" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Reset Password</h2>
              <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send you a reset link.</p>
              <div className="demo-banner mb-6">
                <span className="text-xs">Demo mode: No actual email will be sent. This simulates the password reset flow.</span>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="input-label">Email Address</label>
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input"
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary w-full justify-center py-3">
                  Send Reset Link
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Check your email</h3>
              <p className="text-sm text-gray-500">
                (Demo Mode) A reset link has been simulated for <strong>{email}</strong>
              </p>
              <button onClick={() => setSent(false)} className="btn-secondary mt-4 mx-auto">
                Try another email
              </button>
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
