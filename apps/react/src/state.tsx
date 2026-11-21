import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Access, createHiaokApp, label, translate, type App, type Locale, type MessageKey, type Session } from '@hiaok/core';

interface AppContext {
  /** the use cases — the only way the UI reaches the server */
  app: App;
  session: Session;
  /** what the signed-in user may do (everything visible until the server says otherwise) */
  access: Access;
  update: (patch: Partial<Session>) => void;
  signOut: () => void;
  t: (key: MessageKey) => string;
  l: (name: string) => string;
  locale: Locale;
}

const Ctx = createContext<AppContext | null>(null);

export function AppProvider({ children, app: injected }: { children: ReactNode; app?: App }) {
  const app = useMemo(() => injected ?? createHiaokApp(), [injected]);
  const session = useSyncExternalStore(app.sessions.subscribe, app.sessions.get);
  const [access, setAccess] = useState<Access>(Access.everything);

  const signedIn = Boolean(session.token) || Boolean(session.userUuid);
  useEffect(() => {
    let live = true;
    if (!signedIn) { setAccess(Access.everything); return; }
    void app.auth.access.execute().then((a) => live && setAccess(a));
    return () => { live = false; };
  }, [app, signedIn, session.token, session.baseUrl, session.backend]);

  const value = useMemo<AppContext>(
    () => ({
      app, session, access, locale: session.locale,
      update: (patch) => app.sessions.update(patch),
      signOut: () => { void app.auth.signOut.execute().then(() => { location.hash = '#/login'; }); },
      t: (key) => translate(session.locale, key),
      l: (name) => label(session.locale, name),
    }),
    [app, session, access],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppContext {
  const v = useContext(Ctx);
  if (!v) throw new Error('AppProvider missing');
  return v;
}

/** Tiny hash router: works from file:// and inside the Tauri webview without server rewrites. */
export function useRoute(): string {
  const [hash, setHash] = useState(location.hash.slice(1) || '/');
  useEffect(() => {
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
