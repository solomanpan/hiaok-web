import type { Client } from '@hiaok/api-client';
import {
  clearSession, clientFor, label, loadSession, saveSession, translate,
  type MessageKey, type Session,
} from '@hiaok/shared';

let client: Client | null = null;

/** Session + client + translators shared by every page (one reactive session for the whole app). */
export function useApp() {
  const session = useState<Session>('hiaok-session', () => loadSession(undefined, navigator.language));
  if (!client) {
    client = clientFor(() => session.value, () => signOut());
  }
  function update(patch: Partial<Session>) {
    session.value = { ...session.value, ...patch };
    saveSession(session.value);
  }
  function signOut() {
    session.value = clearSession();
    void navigateTo('/login');
  }
  const t = (key: MessageKey) => translate(session.value.locale, key);
  const l = (name: string) => label(session.value.locale, name);
  return { session, client: client!, update, signOut, t, l };
}

export function errorText(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) {
    const x = e as { message: string; errorCode?: string | null };
    return x.errorCode ? `${x.message} (${x.errorCode})` : x.message;
  }
  return String(e);
}
