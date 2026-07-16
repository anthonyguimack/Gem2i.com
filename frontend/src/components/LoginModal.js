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

  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + '/';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
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
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-slate-400">or continue with</span></div>
              </div>
              <button onClick={handleGoogleLogin} className="w-full border border-slate-200 py-2.5 rounded-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-sm" data-testid="google-login-btn">
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Sign in with Google
              </button>
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
