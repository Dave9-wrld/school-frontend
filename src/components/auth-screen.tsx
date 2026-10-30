'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowUpRight, BookOpen, CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import { api, readSession, saveSession } from '@/lib/api';
import type { Session } from '@/lib/types';
import { Brand, Notice, Submit } from './ui';

export function AuthScreen({ mode }: { mode: 'login' | 'register' }) {
  const register = mode === 'register';
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');

  const [passwordValue, setPasswordValue] = useState('');
  const [confirmPasswordValue, setConfirmPasswordValue] = useState('');

  useEffect(() => {
    if (readSession()) router.replace('/dashboard');
    const params = new URLSearchParams(window.location.search);
    if (params.has('registered')) {
      setUsername(params.get('registered') || '');
      setMessage('Your account is ready. Sign in with your password to continue.');
    }
    if (params.has('expired')) setError('Your session has ended. Please sign in again to continue.');
    if (params.has('reset')) setMessage('Your password has been changed successfully. Sign in with your new password.');
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (register) {
        if (data.password !== data.confirm_password) {
          throw new Error('Your passwords do not match. Please enter the same password in both fields.');
        }
        delete data.confirm_password;
        await api('register/', null, { method: 'POST', body: JSON.stringify(data) });
        router.push(`/login?registered=${encodeURIComponent(String(data.username))}`);
      } else {
        const session = await api<Session>('login/', null, { method: 'POST', body: JSON.stringify(data) });
        saveSession(session);
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please check your information and try again.');
    } finally {
      setBusy(false);
    }
  }

  const passwordsMatch = register && passwordValue.length > 0 && passwordValue === confirmPasswordValue;

  return (
    <main className="auth-page">
      <section className="auth-content">
        <Link href="/login" aria-label="Dave University home">
          <Brand />
        </Link>
        <div className={`auth-form-wrap ${register ? 'register-form' : ''}`}>
          <div className="tiny-label">
            <span /> YOUR UNIVERSITY. YOUR POSSIBILITIES.
          </div>
          <h1>
            {register ? (
              <>
                A new chapter<br />
                starts with <em>you.</em>
              </>
            ) : (
              <>
                Welcome<br />
                <em>back to possibility.</em>
              </>
            )}
          </h1>
          <p className="auth-intro">
            {register
              ? 'Create your student account and make yourself at home.'
              : 'Your academic world, all in one place. Sign in to pick up where you left off.'}
          </p>

          <Notice>{error}</Notice>
          <Notice success>{message}</Notice>

          <form onSubmit={submit} className="auth-form">
            {register && <label>Admission number (optional)<input name="admission_number" maxLength={20} placeholder="Enter your assigned admission number"/></label>}
            {register && (
              <>
                <div className="form-row">
                  <label>
                    First name
                    <input
                      name="first_name"
                      autoComplete="given-name"
                      placeholder="e.g. Samuel"
                      maxLength={150}
                      autoFocus
                      required
                    />
                  </label>
                  <label>
                    Last name
                    <input
                      name="last_name"
                      autoComplete="family-name"
                      placeholder="e.g. Adebayo"
                      maxLength={150}
                      required
                    />
                  </label>
                </div>
                <label>
                  Email address
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                  />
                </label>
              </>
            )}

            <label>
              Username
              <input
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="Enter your username"
                maxLength={150}
                autoFocus={!register}
                required
              />
            </label>

            <label>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Password</span>
                {!register && (
                  <Link className="recovery-link" href="/forgot-password">
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="password-input">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={register ? 'new-password' : 'current-password'}
                  placeholder="Enter your password"
                  value={passwordValue}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {register && (
              <>
                <label>
                  Confirm password
                  <div className="password-input">
                    <input
                      name="confirm_password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Enter your password again"
                      value={confirmPasswordValue}
                      onChange={(e) => setConfirmPasswordValue(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>

                {confirmPasswordValue.length > 0 && (
                  <div className="password-checklist">
                    <span className={`password-check-item ${passwordsMatch ? 'met' : 'unmet'}`}>
                      {passwordsMatch ? <CheckCircle2 size={13} /> : <span style={{ width: 13, height: 13, display: 'inline-block', borderRadius: '50%', border: '1px solid currentColor' }} />}
                      {passwordsMatch ? 'Passwords match' : 'Passwords do not match yet'}
                    </span>
                  </div>
                )}
              </>
            )}

            <Submit busy={busy}>
              {register ? 'Create your student account' : 'Sign in to portal'}
            </Submit>
          </form>

          <p className="auth-switch">
            {register ? 'Already registered?' : 'New student?'}{' '}
            <Link href={register ? '/login' : '/register'}>
              {register ? 'Sign in' : 'Create student account'} <ArrowUpRight size={14} />
            </Link>
          </p>

          <div className="auth-help">
            <ShieldCheck size={19} />
            <p>
              {register
                ? 'Student registration is immediate. Lecturer and administrator accounts are created and configured by university administration.'
                : 'One unified entrance for students, lecturers, and administrators.'}
            </p>
          </div>
        </div>

        <footer className="auth-footer">
          <span>© {new Date().getFullYear()} Dave University</span>
          <span>
            <LockKeyhole size={12} /> Your academic space
          </span>
        </footer>
      </section>

      <aside className="auth-visual">
        <img
          src="/campus.jpg"
          alt="Tree-lined university grounds in warm autumn light"
          className="campus-photo"
        />
        <div className="photo-shade" />
        <div className="visual-top">
          <span className="outline-pill">
            <span /> THE DAVE EXPERIENCE
          </span>
          <span className="visual-year">LEARN. GROW. BECOME.</span>
        </div>
        <div className="visual-copy">
          <div className="visual-rule" />
          <span className="eyebrow">A WORLD OF POSSIBILITIES</span>
          <h2>
            Great futures<br />
            begin with<br />
            <em>curious minds.</em>
          </h2>
          <p>
            A place for your ambition.<br />
            A home for everything you’re becoming.
          </p>
        </div>
        <div className="visual-bottom">
          <span>
            <BookOpen size={20} /> Knowledge is just the beginning.
          </span>
          <span className="round-arrow">
            <ArrowUpRight size={24} />
          </span>
        </div>
      </aside>
    </main>
  );
}
