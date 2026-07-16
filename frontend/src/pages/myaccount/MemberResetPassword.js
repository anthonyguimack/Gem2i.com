import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../../lib/api';
import { Lock, Loader2, ArrowLeft, Check, AlertTriangle, Eye, EyeOff } from 'lucide-react';

/**
 * Step 2 of the recovery flow — operator landed here from the email link.
 * The token is read from the `?token=` query string.
 *
 * We hit /auth/reset-password/verify on mount so we can show a friendly
 * "expired or already used" message instead of letting them type a new
 * password and only learn it failed on submit. The token is single-use:
 * after a successful POST /auth/reset-password the backend marks it used.
 *
 * Styling uses the configurable My Account theme tokens (`--ma-*`).
 */
export default function MemberResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();

  const [verifying, setVerifying] = useState(true);
  const [tokenStatus, setTokenStatus] = useState({ valid: false, reason: '' });
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [pw1Visible, setPw1Visible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setTokenStatus({ valid: false, reason: 'missing' });
      setVerifying(false);
      return;
    }
    authAPI.verifyResetToken(token)
      .then(r => setTokenStatus(r.data || { valid: false, reason: 'unknown' }))
      .catch(() => setTokenStatus({ valid: false, reason: 'network' }))
      .finally(() => setVerifying(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (pw1.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (pw1 !== pw2) {
      setError('The passwords don\u2019t match.');
      return;
    }
    setSubmitting(true);
    try {
      await authAPI.resetPassword(token, pw1);
      setDone(true);
      setTimeout(() => navigate('/my-account/login'), 2500);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not reset the password. The link may have expired.');
    } finally {
      setSubmitting(false);
    }
  };

  const reasonText = {
    missing:   'No reset token was provided. Use the link from your email.',
    not_found: 'This reset link is not valid. It may have been mistyped.',
    used:      'This reset link has already been used. Request a new one if you still need to change your password.',
    expired:   'This reset link has expired. Reset links are valid for 30 minutes — please request a new one.',
    network:   'We could not verify the reset link. Check your connection and try again.',
    unknown:   'This reset link could not be verified.',
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{
        background: 'var(--ma-page-bg, #0d0f14)',
        color: 'var(--ma-text-primary, #ffffff)',
        fontFamily: "'DM Sans', sans-serif",
      }}
      data-testid="reset-password-page"
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
          Reset your password
        </h1>

        {verifying ? (
          <div className="flex items-center gap-2 text-sm mt-8" style={{ color: 'var(--ma-text-secondary, #9ca3af)' }} data-testid="reset-password-verifying">
            <Loader2 className="w-4 h-4 animate-spin" /> Verifying reset link…
          </div>
        ) : !tokenStatus.valid ? (
          <div
            className="mt-4 text-sm p-4 rounded-lg flex items-start gap-3"
            style={{
              background: 'color-mix(in srgb, #f59e0b 12%, transparent)',
              border: '1px solid color-mix(in srgb, #f59e0b 30%, transparent)',
              color: '#fcd34d',
            }}
            data-testid="reset-password-invalid"
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Link not valid</p>
              <p className="text-xs">{reasonText[tokenStatus.reason] || reasonText.unknown}</p>
              <Link
                to="/my-account/forgot-password"
                className="inline-block mt-3 text-xs font-medium underline transition-colors"
                style={{ color: 'var(--ma-accent, #c9a84c)' }}
                data-testid="request-new-link"
              >
                Request a new reset link
              </Link>
            </div>
          </div>
        ) : done ? (
          <div
            className="mt-4 text-sm p-4 rounded-lg flex items-start gap-3"
            style={{
              background: 'color-mix(in srgb, #10b981 12%, transparent)',
              border: '1px solid color-mix(in srgb, #10b981 30%, transparent)',
              color: '#34d399',
            }}
            data-testid="reset-password-success"
          >
            <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Password updated</p>
              <p className="text-xs">You can now sign in with your new password. Redirecting to login…</p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm mb-8" style={{ color: 'var(--ma-text-secondary, #9ca3af)' }}>
              Enter your new password below.
              {tokenStatus.email && (
                <> You&apos;re resetting the password for <strong style={{ color: 'var(--ma-text-primary, #ffffff)' }}>{tokenStatus.email}</strong>.</>
              )}
            </p>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div
                  className="text-sm p-3 rounded-lg"
                  style={{
                    background: 'color-mix(in srgb, #ef4444 12%, transparent)',
                    border: '1px solid color-mix(in srgb, #ef4444 30%, transparent)',
                    color: '#fca5a5',
                  }}
                  data-testid="reset-password-error"
                >
                  {error}
                </div>
              )}
              <PasswordField
                label="New password"
                value={pw1}
                onChange={setPw1}
                placeholder="At least 8 characters"
                visible={pw1Visible}
                onToggleVisible={() => setPw1Visible(v => !v)}
                testId="reset-password-pw1"
              />
              <PasswordField
                label="Confirm new password"
                value={pw2}
                onChange={setPw2}
                placeholder="Repeat the new password"
                visible={false}
                testId="reset-password-pw2"
              />
              <button
                type="submit"
                disabled={submitting || !pw1 || !pw2}
                className="w-full py-3 rounded-lg flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 font-semibold"
                style={{
                  background: 'var(--ma-button-bg, #c9a84c)',
                  color: 'var(--ma-button-text, #0d0f14)',
                }}
                data-testid="reset-password-submit"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {submitting ? 'Updating…' : 'Set new password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, placeholder, visible, onToggleVisible, testId }) {
  return (
    <div>
      <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--ma-text-primary, #ffffff)' }}>{label}</label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ma-text-muted, #6b7280)' }} />
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg pl-10 pr-10 py-3 text-sm focus:outline-none"
          style={{
            background: 'var(--ma-input-bg, #0d0f14)',
            border: '1px solid var(--ma-input-border, rgba(255,255,255,0.1))',
            color: 'var(--ma-text-primary, #ffffff)',
          }}
          required
          minLength={8}
          autoComplete="new-password"
          data-testid={testId}
        />
        {onToggleVisible && (
          <button
            type="button"
            onClick={onToggleVisible}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: 'var(--ma-text-muted, #6b7280)' }}
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
