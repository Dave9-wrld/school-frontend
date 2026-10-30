'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, CheckCircle2, Clock, Eye, EyeOff, Info, LockKeyhole, ShieldCheck } from 'lucide-react';
import { api, clearSession } from '@/lib/api';
import { Brand, Notice, Submit } from './ui';

type Recovery = {
  challenge_id: string;
  username: string;
  email: string;
  expires_at: number;
  requested_at: number;
  dev_hint?: string;
};

type ChallengeResponse = {
  challenge_id: string;
  expires_in: number;
  detail: string;
  dev_hint?: string;
};

const recoveryKey = 'dave.portal.recovery';

export function RecoveryScreen({ mode }: { mode: 'request' | 'reset' }) {
  const router = useRouter();
  const [currentMode, setCurrentMode] = useState<'request' | 'reset'>(mode);
  const resetting = currentMode === 'reset';

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [devHint, setDevHint] = useState('');

  // Form states
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility states
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [recovery, setRecovery] = useState<Recovery | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(recoveryKey) || 'null');
      if (
        typeof saved?.challenge_id === 'string' &&
        typeof saved.username === 'string' &&
        typeof saved.email === 'string' &&
        typeof saved.expires_at === 'number'
      ) {
        setRecovery(saved);
        if (saved.dev_hint) setDevHint(saved.dev_hint);
      } else if (mode === 'reset') {
        // If someone visited /reset-password without a challenge in session, gracefully switch to request
        setCurrentMode('request');
        setError('Please enter your username and email to receive a verification code first.');
      }
    } catch {
      if (mode === 'reset') {
        setCurrentMode('request');
        setError('Please enter your details to receive a new code.');
      }
    }

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [mode]);

  async function requestCode(username: string, email: string) {
    const result = await api<ChallengeResponse>('password-reset/', null, {
      method: 'POST',
      body: JSON.stringify({ username, email }),
    });
    const requested_at = Date.now();
    const pending: Recovery = {
      challenge_id: result.challenge_id,
      username,
      email,
      requested_at,
      expires_at: requested_at + result.expires_in * 1000,
      dev_hint: result.dev_hint,
    };
    sessionStorage.setItem(recoveryKey, JSON.stringify(pending));
    setRecovery(pending);
    setNow(requested_at);
    if (result.dev_hint) setDevHint(result.dev_hint);
    return pending;
  }

  async function handleRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    const cleanUsername = usernameInput.trim();
    const cleanEmail = emailInput.trim();
    try {
      await requestCode(cleanUsername, cleanEmail);
      setCurrentMode('reset');
      setMessage('A six-digit verification code has been dispatched. Enter it below with your new password.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please check your details and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleResetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);

    try {
      if (!recovery || recovery.expires_at <= Date.now()) {
        throw new Error('This verification code has expired. Please send a new code below.');
      }
      if (newPassword.length < 8) {
        throw new Error('Your new password must be at least 8 characters long.');
      }
      if (newPassword !== confirmPassword) {
        throw new Error('Your passwords do not match. Please verify both fields.');
      }

      await api('password-reset/confirm/', null, {
        method: 'POST',
        body: JSON.stringify({
          challenge_id: recovery.challenge_id,
          code: code.trim(),
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      sessionStorage.removeItem(recoveryKey);
      clearSession();
      router.replace('/login?reset=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please check your code and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    if (!recovery) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await requestCode(recovery.username, recovery.email);
      setCode('');
      setMessage('A fresh verification code was sent. Please use the most recent code.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resend code. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const expired = !!recovery && recovery.expires_at <= now;
  const remainingSeconds = recovery ? Math.max(0, Math.ceil((recovery.expires_at - now) / 1000)) : 0;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const resendWait = recovery ? Math.max(0, Math.ceil((recovery.requested_at + 60000 - now) / 1000)) : 0;

  const passwordLengthMet = newPassword.length >= 8;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <main className="auth-page">
      <section className="auth-content">
        <Link href="/login" aria-label="Dave University home">
          <Brand />
        </Link>
        <div className="auth-form-wrap">
          <div className="tiny-label">
            <span /> SECURE ACCOUNT ACCESS
          </div>

          <div className="recovery-stepper">
            <div className={`recovery-step ${!resetting ? 'active' : 'done'}`}>
              <span className="recovery-step-num">{!resetting ? '1' : <Check size={12} />}</span>
              <span>1. Request Code</span>
            </div>
            <span className="recovery-step-divider" />
            <div className={`recovery-step ${resetting ? 'active' : ''}`}>
              <span className="recovery-step-num">2</span>
              <span>2. Choose Password</span>
            </div>
          </div>

          <h1>
            {resetting ? (
              <>
                Verify &amp; set<br />
                <em>new password.</em>
              </>
            ) : (
              <>
                Let’s get<br />
                <em>you back in.</em>
              </>
            )}
          </h1>

          <p className="auth-intro">
            {resetting
              ? 'Enter the 6-digit code sent to your account email along with your desired new password.'
              : 'Enter your university username and registered email address to receive your 6-digit recovery code.'}
          </p>

          <Notice>{error || (expired && resetting ? 'Your verification code has expired. Please request a new one below.' : '')}</Notice>
          <Notice success>{message}</Notice>

          {devHint && (
            <div className="dev-notice" role="note">
              <Info size={16} />
              <span>{devHint}</span>
            </div>
          )}

          {!resetting ? (
            /* STEP 1: REQUEST CODE FORM */
            <form className="auth-form" onSubmit={handleRequestSubmit}>
              <label>
                Username
                <input
                  name="username"
                  autoComplete="username"
                  maxLength={150}
                  placeholder="e.g. jdoe or student_id"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  autoFocus
                  required
                />
              </label>
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  placeholder="you@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  required
                />
              </label>

              <Submit busy={busy}>Send verification code</Submit>
            </form>
          ) : (
            /* STEP 2: VERIFY CODE & SET PASSWORD FORM */
            <>
              {recovery && (
                <div className="recovery-account-card">
                  <div>
                    <span className="recovery-account-label">Target account</span>
                    <strong>@{recovery.username}</strong>
                    <span className="recovery-account-email">{recovery.email}</span>
                  </div>
                  <button
                    type="button"
                    className="recovery-change-btn"
                    onClick={() => {
                      setCurrentMode('request');
                      setError('');
                      setMessage('');
                    }}
                  >
                    Change
                  </button>
                </div>
              )}

              <form className="auth-form" onSubmit={handleResetSubmit}>
                <label>
                  Verification code
                  <input
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    minLength={6}
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    autoFocus
                    className="otp-input"
                  />
                </label>

                {recovery && (
                  <div className={`recovery-timer ${expired ? 'expired' : ''}`}>
                    <Clock size={14} />
                    <span>
                      {expired ? 'Code expired' : `Code expires in ${formattedTime}`}
                    </span>
                  </div>
                )}

                <label style={{ marginTop: '14px' }}>
                  New password
                  <div className="password-input">
                    <input
                      name="new_password"
                      type={showNew ? 'text' : 'password'}
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={4096}
                      placeholder="At least 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      aria-label={showNew ? 'Hide new password' : 'Show new password'}
                      onClick={() => setShowNew(!showNew)}
                    >
                      {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>

                <label>
                  Confirm new password
                  <div className="password-input">
                    <input
                      name="confirm_password"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={4096}
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                      onClick={() => setShowConfirm(!showConfirm)}
                    >
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>

                <div className="password-checklist">
                  <span className={`password-check-item ${passwordLengthMet ? 'met' : 'unmet'}`}>
                    {passwordLengthMet ? <CheckCircle2 size={13} /> : <span style={{ width: 13, height: 13, display: 'inline-block', borderRadius: '50%', border: '1px solid currentColor' }} />}
                    At least 8 characters
                  </span>
                  {confirmPassword.length > 0 && (
                    <span className={`password-check-item ${passwordsMatch ? 'met' : 'unmet'}`}>
                      {passwordsMatch ? <CheckCircle2 size={13} /> : <span style={{ width: 13, height: 13, display: 'inline-block', borderRadius: '50%', border: '1px solid currentColor' }} />}
                      {passwordsMatch ? 'Passwords match' : 'Passwords do not match yet'}
                    </span>
                  )}
                </div>

                <Submit busy={busy} disabled={expired}>
                  Verify code &amp; reset password
                </Submit>
              </form>
            </>
          )}

          {resetting && recovery && (
            <p className="auth-switch">
              <button
                type="button"
                className="recovery-link"
                disabled={busy || resendWait > 0}
                onClick={handleResend}
              >
                {resendWait > 0 ? `Send a new code in ${resendWait}s` : 'Send a new code'}
              </button>
            </p>
          )}

          <p className="auth-switch">
            <Link href="/login">
              <ArrowLeft size={14} /> Back to sign in
            </Link>
          </p>

          <div className="auth-help">
            <ShieldCheck size={19} />
            <p>
              Your academic records and course grades stay intact. If you run into issues, contact the university portal administrator.
            </p>
          </div>
        </div>

        <footer className="auth-footer">
          <span>© {new Date().getFullYear()} Dave University</span>
          <span>
            <LockKeyhole size={12} /> Secure University Portal
          </span>
        </footer>
      </section>

      <aside className="auth-visual">
        <img src="/campus.jpg" alt="Tree-lined university grounds" className="campus-photo" />
        <div className="photo-shade" />
        <div className="visual-top">
          <span className="outline-pill">
            <span /> THE DAVE EXPERIENCE
          </span>
        </div>
        <div className="visual-copy">
          <div className="visual-rule" />
          <span className="eyebrow">A PLACE TO RETURN TO</span>
          <h2>
            Your journey<br />
            continues<br />
            <em>right here.</em>
          </h2>
          <p>
            Regain access to your academic space,<br />
            results, and semester resources.
          </p>
        </div>
      </aside>
    </main>
  );
}
