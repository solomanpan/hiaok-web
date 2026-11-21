import { emptySession, type Session } from '../domain/session';
import type { SessionStore } from '../domain/ports';
import { detectLocale } from '../i18n/messages';

const KEY = 'hiaok-web.session';

export interface KeyValueStorage {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

const inMemory = (): KeyValueStorage => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};

/** localStorage when the web view allows it, memory otherwise (private mode, blocked storage). */
export function browserStorage(): KeyValueStorage {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    /* storage blocked */
  }
  return inMemory();
}

export class LocalSessionStore implements SessionStore {
  constructor(
    private readonly storage: KeyValueStorage = browserStorage(),
    private readonly navigatorLanguage?: string,
  ) {}

  load(): Session {
    const base = emptySession(detectLocale(this.navigatorLanguage));
    try {
      const raw = this.storage.getItem(KEY);
      if (raw) return { ...base, ...(JSON.parse(raw) as Partial<Session>) };
    } catch {
      /* corrupt value: start over */
    }
    return base;
  }

  save(session: Session): void {
    this.storage.setItem(KEY, JSON.stringify(session));
  }
}
