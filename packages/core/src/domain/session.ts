import type { Locale } from '../i18n/messages';

export type Backend = 'hiaok' | 'kimoj' | 'ladepa';
export const BACKENDS: Backend[] = ['hiaok', 'kimoj', 'ladepa'];

/** Who is using which server in which organization. Pure data + the rules for changing it (no storage, no HTTP). */
export interface Session {
  baseUrl: string;
  backend: Backend;
  token: string | null;
  orgUuid: string;
  tenantUuid: string;
  userUuid: string;
  locale: Locale;
}

export const emptySession = (locale: Locale = 'en'): Session => ({
  baseUrl: '', backend: 'hiaok', token: null, orgUuid: '', tenantUuid: '', userUuid: '', locale,
});

/** A session counts as signed in with a token, or (server running with auth off) with a known user. */
export const isSignedIn = (s: Session): boolean => Boolean(s.token) || Boolean(s.userUuid);

/** Signing out keeps the server settings and the language, and drops the credentials and the identity. */
export const signedOut = (s: Session): Session => ({ ...emptySession(s.locale), baseUrl: s.baseUrl, backend: s.backend });
