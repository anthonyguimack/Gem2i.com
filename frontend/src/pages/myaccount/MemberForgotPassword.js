import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../../lib/api';
import { Mail, Loader2, ArrowLeft, Check } from 'lucide-react';
import CaptchaWidget from '../../components/CaptchaWidget';

/**
 * Step 1 of the recovery flow — operator enters their email and we trigger
 * the backend to send a one-time link. The backend returns the same neutral
 * message whether or not the email exists, so we never leak account presence.
 *
 * Styling uses the configurable My Account theme tokens (`--ma-*`) so this
 * page automatically picks up any colour changes made in CMS → Settings →
 * My Account, matching the rest of the membership area.
 */
export default function MemberForgotPassword() {
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authAPI.forgotPassword(email.trim().toLowerCase(), captchaToken);
      setSent(true);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not send the email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{
        background: 'var(--ma-page-bg, #0d0f14)',
        color: 'var(--ma-text-primary, #ffffff)',
        fontFamily: "'DM Sans', sans-serif",
      }}
      data-testid="forgot-password-page"
    >
      <div className="w-full max-w-md">
        <Link
          to="/my-account/login"
          className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors"
          style={{ color: 'var(--ma-text-secondary, #9ca3af)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ma-accent, #c9a84c)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ma-text-secondary, #9ca3af)')}
          data-testid="back-to-login"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to login
        </Link>

        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--ma-text-primary, #ffffff)' }}>
          Forgot your password?
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--ma-text-secondary, #9ca3af)' }}>
          Enter the email associated with your account and we&apos;ll send you a one-time link to reset your password.
        </p>

        {sent ? (
          <div
            className="text-sm p-4 rounded-lg flex items-start gap-3"
            style={{
              background: 'color-mix(in srgb, #10b981 12%, transparent)',
              border: '1px solid color-mix(in srgb, #10b981 30%, transparent)',
              color: '#34d399',
            }}
            data-testid="forgot-password-success"
          >
            <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Check your inbox</p>
              <p className="text-xs">If an account exists for <strong>{email}</strong>, you&apos;ll receive a reset link shortly. The link expires in 30 minutes and can only be used once.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                className="text-sm p-3 rounded-lg"
                style={{
                  background: 'color-mix(in srgb, #ef4444 12%, transparent)',
                  border: '1px solid color-mix(in srgb, #ef4444 30%, transparent)',
                  color: '#fca5a5',
                }}
                data-testid="forgot-password-error"
              >
                {error}
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--ma-text-primary, #ffffff)' }}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ma-text-muted, #6b7280)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none"
                  style={{
                    background: 'var(--ma-input-bg, #0d0f14)',
                    border: '1px solid var(--ma-input-border, rgba(255,255,255,0.1))',
                    color: 'var(--ma-text-primary, #ffffff)',
                  }}
                  required
                  autoComplete="email"
                  data-testid="forgot-password-email"
                />
              </div>
            </div>

            <CaptchaWidget onChange={setCaptchaToken} testId="forgot-captcha" />

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3 rounded-lg flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 font-semibold"
              style={{
                background: 'var(--ma-button-bg, #c9a84c)',
                color: 'var(--ma-button-text, #0d0f14)',
              }}
              data-testid="forgot-password-submit"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
