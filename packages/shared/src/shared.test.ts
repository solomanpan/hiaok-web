import { describe, expect, it } from 'vitest';
import { clearSession, detectLocale, loadSession, messages, saveSession, type Store } from './index';

const store = (): Store => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};

describe('messages', () => {
  it('every language has every key', () => {
    const keys = Object.keys(messages.en).sort();
    expect(Object.keys(messages.zh).sort()).toEqual(keys);
    expect(Object.keys(messages.ja).sort()).toEqual(keys);
  });
  it('detects the locale from the browser language', () => {
    expect([detectLocale('zh-CN'), detectLocale('ja-JP'), detectLocale('fr'), detectLocale()]).toEqual(['zh', 'ja', 'en', 'en']);
  });
});

describe('session', () => {
  it('round-trips and survives a corrupt value', () => {
    const s = store();
    expect(loadSession(s).token).toBeNull();
    saveSession({ ...loadSession(s), token: 't', orgUuid: 'o' }, s);
    expect(loadSession(s)).toMatchObject({ token: 't', orgUuid: 'o' });
    s.setItem('hiaok-web.session', '{oops');
    expect(loadSession(s).token).toBeNull();
  });
  it('logging out keeps the server settings but drops the credentials', () => {
    const s = store();
    saveSession({ ...loadSession(s), baseUrl: 'http://x', backend: 'ladepa', token: 't', orgUuid: 'o', locale: 'ja' }, s);
    expect(clearSession(s)).toMatchObject({ baseUrl: 'http://x', backend: 'ladepa', locale: 'ja', token: null, orgUuid: '' });
  });
});
