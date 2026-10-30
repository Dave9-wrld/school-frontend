import type { Session } from './types';
const key = 'dave.portal.session';

export function readSession(): Session | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (value?.token && ['STUDENT','TEACHER','ADMIN'].includes(value.role) && Date.parse(value.expires_at) > Date.now()) return value;
    sessionStorage.removeItem(key);
  } catch { /* A blocked store can be recovered by signing in again. */ }
  return null;
}
export function saveSession(value: Session) { sessionStorage.setItem(key, JSON.stringify(value)); }
export function clearSession() { try { sessionStorage.removeItem(key); } catch {} }

export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function api<T>(path: string, session: Session | null, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body) headers.set('Content-Type', 'application/json');
  if (session) headers.set('Authorization', `Token ${session.token}`);
  let response: Response;
  try { response = await fetch(`/api/${path.replace(/^\//, '')}`, {...options, headers, cache:'no-store'}); }
  catch { throw new ApiError('We could not connect to the portal. Please try again.', 0); }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && session) {
      clearSession(); window.location.replace('/login?expired=1');
      throw new ApiError('Your session has ended. Please sign in again.', 401);
    }
    const entry = payload && Object.entries(payload)[0];
    const extractedMessage = payload?.detail || payload?.error || (entry ? `${entry[0] === 'non_field_errors' ? '' : entry[0].replaceAll('_',' ') + ': '}${Array.isArray(entry[1]) ? entry[1].join(' ') : entry[1]}` : null);
    if (extractedMessage) throw new ApiError(extractedMessage, response.status);
    if (response.status === 403) throw new ApiError('Your account does not have access to this service.', 403);
    if (response.status >= 500) throw new ApiError(path.startsWith('password-reset') ? 'Password recovery is temporarily unavailable. Please contact the university administrator.' : 'The academic service is temporarily unavailable. Please try again shortly.', response.status);
    throw new ApiError('We could not complete this request.', response.status);
  }
  return payload as T;
}
