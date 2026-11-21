import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Access, label, translate, type App, type Locale, type MessageKey, type Session } from '@hiaok/core';

/** Where the user is: `login`, `register`, or a resource page. (A tiny state router — the same on every platform.) */
export type Route = { name: 'login' } | { name: 'register' } | { name: 'resource'; resource?: string };

interface AppContext {
  /** the use cases — the only way the UI reaches the server */
  app: App;
  session: Session;
  /** what the signed-in user may do (everything visible until the server says otherwise) */
  access: Access;
  update: (patch: Partial<Session>) => void;
  signOut: () => void;
  route: Route;
  go: (route: Route) => void;
  t: (key: MessageKey) => string;
  l: (name: string) => string;
  locale: Locale;
}

const Ctx = createContext<AppContext | null>(null);

export function AppProvider({ children, app }: { children: ReactNode; app: App }) {
  const session = useSyncExternalStore(app.sessions.subscribe, app.sessions.get);
  const [access, setAccess] = useState<Access>(Access.everything);
  const signedIn = Boolean(session.token) || Boolean(session.userUuid);
  const [route, go] = useState<Route>(signedIn ? { name: 'resource' } : { name: 'login' });

  useEffect(() => {
    let live = true;
    if (!signedIn) { setAccess(Access.everything); go((r) => (r.name === 'register' ? r : { name: 'login' })); return; }
    void app.auth.access.execute().then((a) => live && setAccess(a));
    return () => { live = false; };
  }, [app, signedIn, session.token, session.baseUrl, session.backend]);

  const value = useMemo<AppContext>(
    () => ({
      app, session, access, locale: session.locale, route, go,
      update: (patch) => app.sessions.update(patch),
      signOut: () => { void app.auth.signOut.execute().then(() => go({ name: 'login' })); },
      t: (key) => translate(session.locale, key),
      l: (name) => label(session.locale, name),
    }),
    [app, session, access, route],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppContext {
  const v = useContext(Ctx);
  if (!v) throw new Error('AppProvider missing');
  return v;
}

export function errorText(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) {
    const x = e as { message: string; errorCode?: string | null };
    return x.errorCode ? `${x.message} (${x.errorCode})` : x.message;
  }
  return String(e);
}
