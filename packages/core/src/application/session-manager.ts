import { isSignedIn, signedOut, type Session } from '../domain/session';
import type { SessionStore } from '../domain/ports';

/** Holds the one current session, persists every change and tells listeners (the UI) about it. */
export class SessionManager {
  private current: Session;
  private listeners = new Set<() => void>();

  constructor(private readonly store: SessionStore) {
    this.current = store.load();
  }

  /** stable between changes (usable with React's useSyncExternalStore) */
  get = (): Session => this.current;

  update(patch: Partial<Session>): void {
    this.current = { ...this.current, ...patch };
    this.store.save(this.current);
    this.listeners.forEach((l) => l());
  }

  signOut(): void {
    this.current = signedOut(this.current);
    this.store.save(this.current);
    this.listeners.forEach((l) => l());
  }

  isSignedIn = (): boolean => isSignedIn(this.current);

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}
