import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Client } from '@hiaok/api-client';
import {
  clearSession, clientFor, label, loadSession, saveSession, translate,
  type Locale, type MessageKey, type Session,
} from '@hiaok/shared';

interface App {
  session: Session;
  client: Client;
  update: (patch: Partial<Session>) => void;
  signOut: () => void;
  t: (key: MessageKey) => string;
  l: (name: string) => string;
  locale: Locale;
}

const Ctx = createContext<App | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(() => loadSession(undefined, navigator.language));
  const ref = useRef(session);
  ref.current = session;

  const update = useCallback((patch: Partial<Session>) => {
    const next = { ...ref.current, ...patch };
    ref.current = next;
    saveSession(next);
    setSession(next);
  }, []);

  const signOut = useCallback(() => {
    const next = clearSession();
    ref.current = next;
    setSession(next);
    location.hash = '#/login';
  }, []);

  // one client for the whole app; it reads the current session on every call
  const client = useMemo(() => clientFor(() => ref.current, () => signOut()), [signOut]);

  const value = useMemo<App>(
    () => ({
      session, client, update, signOut, locale: session.locale,
      t: (key) => translate(session.locale, key),
      l: (name) => label(session.locale, name),
    }),
    [session, client, update, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): App {
  const v = useContext(Ctx);
  if (!v) throw new Error('AppProvider missing');
  return v;
}

/** Tiny hash router: works from file:// and inside the Tauri webview without server rewrites. */
export function useRoute(): string {
  const [hash, setHash] = useState(location.hash.slice(1) || '/');
  useMemo(() => {
    const on = () => setHash(location.hash.slice(1) || '/');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

export function errorText(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) {
    const x = e as { message: string; errorCode?: string | null };
    return x.errorCode ? `${x.message} (${x.errorCode})` : x.message;
  }
  return String(e);
}
