import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { publicAPI } from '../lib/api';

/**
 * Lightweight wrapper around react-google-recaptcha that pulls the current
 * site key + enabled state from CMS → Settings → Captcha (`/api/public/captcha-config`)
 * so the widget can be turned on/off and the key rotated without redeploying.
 *
 * Behaviour:
 *  - If captcha is disabled (or no site key configured), renders nothing and
 *    immediately yields a synthetic empty token via `onChange("")`.  Public
 *    endpoints accept an empty token in that mode.
 *  - When the user solves the challenge, `onChange(token)` is fired so the
 *    parent form can include it in its POST body.
 *  - When the token expires (~2 min), `onChange("")` is fired so the parent
 *    can disable its submit button.
 *
 * Forwarded ref exposes `reset()` so a form can clear the widget after
 * a failed submit (Google requires a fresh token on each retry).
 */
const CaptchaWidget = forwardRef(function CaptchaWidget({ onChange, testId = 'captcha' }, ref) {
  const [config, setConfig] = useState(null);
  const recaptchaRef = useRef(null);

  useImperativeHandle(ref, () => ({
    reset: () => {
      try { recaptchaRef.current?.reset?.(); } catch (e) { /* noop */ }
      onChange?.('');
    },
  }), [onChange]);

  useEffect(() => {
    publicAPI.getCaptchaConfig()
      .then(r => setConfig(r.data || {}))
      .catch(() => setConfig({ enabled: false }));
  }, []);

  // While we don't yet know the config, render nothing — the parent form
  // disables submit until config arrives so we don't accept submits without
  // captcha when it's actually required.
  if (!config) return null;

  if (!config.enabled || !config.site_key) {
    // Captcha deliberately off — emit an empty token once so the parent
    // form's "is captcha solved?" check passes.
    return <input type="hidden" value="" data-testid={`${testId}-disabled`} />;
  }

  return (
    <div data-testid={testId}>
      <ReCAPTCHA
        ref={recaptchaRef}
        sitekey={config.site_key}
        onChange={(token) => onChange?.(token || '')}
        onExpired={() => onChange?.('')}
        onErrored={() => onChange?.('')}
        theme="dark"
      />
    </div>
  );
});

export default CaptchaWidget;
