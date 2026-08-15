import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bus, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface FormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    if (!form.name.trim()) return 'Full name is required.';
    if (!form.email.includes('@')) return 'Enter a valid email address.';
    if (!/^\d{10}$/.test(form.phone)) return 'Enter a valid 10-digit phone number.';
    if (form.password.length < 6) return 'Password must be at least 6 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    const result = await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
    setLoading(false);
    if (result.success) {
      toast.success('Account created successfully! Welcome to SMARTBUS+');
    } else {
      setError(result.error || 'Registration failed.');
    }
  };

  const requirements = [
    { text: 'At least 6 characters', ok: form.password.length >= 6 },
    { text: 'Passwords match', ok: form.password === form.confirmPassword && form.password.length > 0 },
  ];

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
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Create Account</h2>
          <p className="text-sm text-gray-500 mb-6">Register as a new SMARTBUS+ passenger</p>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="input-label">Full Name</label>
              <input id="name" type="text" value={form.name} onChange={set('name')} className="input" placeholder="Tamil Kumar" required />
            </div>

            <div>
              <label htmlFor="email" className="input-label">Email Address</label>
              <input id="email" type="email" value={form.email} onChange={set('email')} className="input" placeholder="you@example.com" required />
            </div>

            <div>
              <label htmlFor="phone" className="input-label">Phone Number</label>
              <input id="phone" type="tel" value={form.phone} onChange={set('phone')} className="input" placeholder="9876543210" maxLength={10} required />
            </div>

            <div>
              <label htmlFor="reg-password" className="input-label">Password</label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  className="input pr-10"
                  placeholder="Min. 6 characters"
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="input-label">Confirm Password</label>
              <input
                id="confirm-password"
                type="password"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                className="input"
                placeholder="Repeat password"
                required
              />
            </div>

            {form.password && (
              <div className="space-y-1.5">
                {requirements.map(r => (
                  <div key={r.text} className={`flex items-center gap-2 text-xs ${r.ok ? 'text-green-600' : 'text-gray-400'}`}>
                    <CheckCircle className={`w-3.5 h-3.5 ${r.ok ? 'text-green-500' : 'text-gray-300'}`} />
                    {r.text}
                  </div>
                ))}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 mt-2">
              {loading && <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-4 text-xs text-gray-400 text-center">
            A unique Passenger ID (e.g., <strong>SBP10004</strong>) will be generated for you.
          </div>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-700 font-medium hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
