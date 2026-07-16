import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { authAPI } from '../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { LogIn, Mail, Lock, Loader2, ArrowLeft, KeyRound, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function LoginModal({ open, onClose }) {
  const { login, setUserData } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState('login'); // 'login', 'forgot', 'reset'
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      onClose();
      setEmail(''); setPassword('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.forgotPassword(resetEmail);
      toast.success('If the email exists, a reset link has been sent.');
      setView('reset');
    } catch { toast.error('Error sending reset email'); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.resetPassword(resetToken, newPassword);
      toast.success('Password reset successfully! You can now login.');
      setView('login'); setResetToken(''); setNewPassword('');
    } catch (err) { toast.error(err.response?.data?.detail || 'Reset failed'); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setView('login'); } }}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden" data-testid="login-modal">
        <div className="p-6" style={{ backgroundColor: 'var(--color-primary, #1a2332)' }}>
          <DialogHeader>
            <DialogTitle className="text-white text-xl" style={{fontFamily: 'Playfair Display, serif'}}>
              {view === 'login' ? 'Welcome Back' : view === 'forgot' ? 'Forgot Password' : 'Reset Password'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/60 text-sm mt-1">
            {view === 'login' ? 'Sign in to access your account' : view === 'forgot' ? 'Enter your email to receive a reset link' : 'Enter your reset token and new password'}
          </p>
        </div>
        <div className="p-6">
          {view === 'login' && (
            <>
              {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-sm mb-4" data-testid="login-error">{error}</div>}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-slate-700">Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input type="text" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required data-testid="login-email-input" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700">Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required data-testid="login-password-input" />
                  </div>
                </div>
                <button type="button" onClick={() => setView('forgot')} className="text-xs hover:underline" style={{ color: 'var(--color-link, #0D9488)' }} data-testid="forgot-password-link">Forgot your password?</button>
                <button type="submit" disabled={loading} className="w-full py-2.5 rounded-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: 'var(--color-button-bg, #1a2332)', color: 'var(--color-button-text, #fff)' }} data-testid="login-submit-btn">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
              <div className="mt-4 text-center">
                <Link to="/my-account/register" onClick={onClose} className="text-sm hover:underline flex items-center justify-center gap-1" style={{ color: 'var(--color-link, #0D9488)' }} data-testid="register-from-modal">
                  <UserPlus className="w-3.5 h-3.5" /> Register with Invite Code
                </Link>
              </div>
            </>
          )}
          {view === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <Label>Email Address</Label>
                <Input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="Enter your email" className="mt-1" required />
              </div>
              <button type="submit" disabled={loading} className="w-full py-2.5 rounded-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: 'var(--color-button-bg, #1a2332)', color: 'var(--color-button-text, #fff)' }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Send Reset Link
              </button>
              <button type="button" onClick={() => setView('login')} className="w-full text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Back to Login
              </button>
            </form>
          )}
          {view === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <Label>Reset Token</Label>
                <div className="relative mt-1">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input value={resetToken} onChange={e => setResetToken(e.target.value)} placeholder="Paste reset token" className="pl-10" required />
                </div>
              </div>
              <div>
                <Label>New Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" className="pl-10" required />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full py-2.5 rounded-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: 'var(--color-button-bg, #1a2332)', color: 'var(--color-button-text, #fff)' }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Reset Password
              </button>
              <button type="button" onClick={() => setView('login')} className="w-full text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Back to Login
              </button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
