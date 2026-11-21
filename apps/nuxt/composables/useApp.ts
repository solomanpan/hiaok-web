import {
  Access, createHiaokApp, isSignedIn, label, translate,
  type App, type MessageKey, type Session,
} from '@hiaok/core';

let singleton: App | null = null;

/**
 * The use cases plus the reactive bits the pages need. The UI reaches the server only through `app` (use cases);
 * `session` mirrors the session manager so templates update when it changes.
 */
export function useApp() {
  if (!singleton) singleton = createHiaokApp();
  const app = singleton;
  const session = useState<Session>('hiaok-session', () => app.sessions.get());
  const access = useState<Access>('hiaok-access', () => Access.everything);

  if (import.meta.client && !useState('hiaok-wired', () => false).value) {
    useState('hiaok-wired').value = true;
    app.sessions.subscribe(() => { session.value = app.sessions.get(); });
    watch(
      () => [isSignedIn(session.value), session.value.token, session.value.baseUrl, session.value.backend],
      async () => {
        access.value = isSignedIn(session.value) ? await app.auth.access.execute() : Access.everything;
      },
      { immediate: true },
    );
  }

  const update = (patch: Partial<Session>) => app.sessions.update(patch);
  const signOut = async () => {
    await app.auth.signOut.execute();
    await navigateTo('/login');
  };
  const t = (key: MessageKey) => translate(session.value.locale, key);
  const l = (name: string) => label(session.value.locale, name);
  return { app, session, access, update, signOut, t, l };
}

export function errorText(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) {
    const x = e as { message: string; errorCode?: string | null };
    return x.errorCode ? `${x.message} (${x.errorCode})` : x.message;
  }
  return String(e);
}
