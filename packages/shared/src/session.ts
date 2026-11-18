import { createClient, type Client } from '@hiaok/api-client';
import { detectLocale, type Locale } from './messages';

export type Backend = 'hiaok' | 'kimoj' | 'ladepa';
export const BACKENDS: Backend[] = ['hiaok', 'kimoj', 'ladepa'];

export interface Session {
  baseUrl: string;
  backend: Backend;
  token: string | null;
  orgUuid: string;
  tenantUuid: string;
  userUuid: string;
  locale: Locale;
}

const KEY = 'hiaok-web.session';

export interface Store {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

const memory = (): Store => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};

export function defaultStore(): Store {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    /* storage blocked */
  }
  return memory();
}

export function emptySession(navigatorLanguage?: string): Session {
  return { baseUrl: '', backend: 'hiaok', token: null, orgUuid: '', tenantUuid: '', userUuid: '', locale: detectLocale(navigatorLanguage) };
}

export function loadSession(store: Store = defaultStore(), navigatorLanguage?: string): Session {
  const base = emptySession(navigatorLanguage);
  try {
    const raw = store.getItem(KEY);
    if (raw) return { ...base, ...(JSON.parse(raw) as Partial<Session>) };
  } catch {
    /* corrupt value: start over */
  }
  return base;
}

export function saveSession(s: Session, store: Store = defaultStore()): void {
  store.setItem(KEY, JSON.stringify(s));
}

export function clearSession(store: Store = defaultStore()): Session {
  const keep = loadSession(store);
  const fresh = { ...emptySession(), baseUrl: keep.baseUrl, backend: keep.backend, locale: keep.locale };
  saveSession(fresh, store);
  return fresh;
}

/** A client that always reads the current session (token, locale, backend) through `get`. */
export function clientFor(get: () => Session, onUnauthenticated?: () => void): Client {
  return createClient({
    get baseUrl() {
      return get().baseUrl;
    },
    get prefix() {
      return `/v1/api/${get().backend}`;
    },
    getToken: () => get().token,
    getLocale: () => get().locale,
    onUnauthenticated,
  } as Parameters<typeof createClient>[0]);
}
