import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMember } from '../../lib/memberAuth';
import { publicAPI } from '../../lib/api';
import { LogIn, Mail, Lock, Loader2, UserPlus } from 'lucide-react';
import { useT } from '../../lib/i18n';

export default function MemberLogin() {
  const { member, login } = useMember();
  const navigate = useNavigate();
  const tt = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState({});

  useEffect(() => {
    publicAPI.getSettings().then(r => setSettings(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (member) navigate('/my-account/membership-profile', { replace: true });
  }, [member, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/my-account/membership-profile');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const brandName = tt(settings.brand_name) || 'Legacy';
  const bgImage = settings.membership_login_bg || '';

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'DM Sans', sans-serif" }} data-testid="member-login-page">
      {/* Left: Form */}
      <div className="flex-1 flex items-center justify-center bg-[#0d0f14] px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-10" data-testid="member-login-brand">
            <div className="w-10 h-10 bg-[#c9a84c] rounded flex items-center justify-center">
              <span className="text-[#0d0f14] font-bold text-lg" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {brandName[0]}
              </span>
            </div>
            <span className="text-white text-xl font-semibold">{brandName}</span>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Welcome Back
          </h1>
          <p className="text-gray-400 text-sm mb-8">Sign in to access your membership area</p>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-4" data-testid="member-login-error">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="text" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full bg-[#13161e] border border-white/10 text-white rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#c9a84c]/50"
                  required data-testid="member-login-email" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-[#13161e] border border-white/10 text-white rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#c9a84c]/50"
                  required data-testid="member-login-password" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-[#c9a84c] text-[#0d0f14] font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-[#b8973f] transition-colors disabled:opacity-50"
              data-testid="member-login-submit">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <div className="mt-4 text-center">
            <Link to="/my-account/forgot-password" className="text-xs text-gray-400 hover:text-[#c9a84c] hover:underline" data-testid="forgot-password-link">
              Forgot your password?
            </Link>
          </div>
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              Don't have an account?{' '}
              <Link to="/my-account/register" className="text-[#c9a84c] hover:underline font-medium" data-testid="member-register-link">
                <UserPlus className="w-3.5 h-3.5 inline mr-1" />Register
              </Link>
            </p>
          </div>
        </div>
      </div>
      {/* Right: Background image */}
      <div className="hidden lg:block lg:w-[45%] relative bg-[#13161e]"
        style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
        {!bgImage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-[#c9a84c]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-[#c9a84c] text-3xl font-bold" style={{ fontFamily: "'DM Serif Display', serif" }}>{brandName[0]}</span>
              </div>
              <h2 className="text-white text-2xl font-bold" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {brandName}
              </h2>
              <p className="text-gray-500 text-sm mt-2">Membership Portal</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
