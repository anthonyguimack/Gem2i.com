import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password, 'cms');
      const hasCmsAccess = result?.role === 'admin' || ((result?.effective_permissions || []).length > 0);
      if (hasCmsAccess) {
        navigate('/admin');
      } else {
        setError('Access denied. No CMS permissions assigned to this account.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0f1117' }} data-testid="admin-login-page">
      <div className="w-full max-w-sm rounded-lg p-8 border" style={{ backgroundColor: '#13161e', borderColor: 'rgba(201,168,76,0.2)' }}>
        <h1 className="text-xl font-bold text-center mb-6" style={{ color: '#f5f5f5', fontFamily: 'Playfair Display, serif' }}>Admin Login</h1>
        {error && <div className="bg-red-900/30 text-red-300 text-sm p-3 rounded mb-4 text-center">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 rounded text-sm" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.2)', color: '#f5f5f5' }} data-testid="admin-login-email" />
          <input type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 rounded text-sm" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.2)', color: '#f5f5f5' }} data-testid="admin-login-password" />
          <button type="submit" disabled={loading} className="w-full py-3 rounded text-sm font-semibold hover:opacity-80 disabled:opacity-50" style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)', color: 'var(--ad-button-text, #ffffff)' }} data-testid="admin-login-submit">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
