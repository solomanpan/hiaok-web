import { describe, expect, it } from 'vitest';
import { createHiaokApp, createHttpGateways, emptySession, LocalSessionStore, SessionManager, type KeyValueStorage, type Session } from '../index';

const memory = (): KeyValueStorage => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};

describe('local session store', () => {
  it('round-trips, takes the language from the browser, and survives a corrupt value', () => {
    const storage = memory();
    const store = new LocalSessionStore(storage, 'zh-CN');
    expect(store.load()).toMatchObject({ token: null, locale: 'zh' });
    store.save({ ...store.load(), token: 't', orgUuid: 'o' });
    expect(store.load()).toMatchObject({ token: 't', orgUuid: 'o' });
    storage.setItem('hiaok-web.session', '{oops');
    expect(store.load().token).toBeNull();
  });
});

describe('http gateway', () => {
  const ok = (resultInfo: unknown) => new Response(JSON.stringify({ code: 0, msg: 'success', resultInfo }));

  it('reads server, backend prefix, token and language from the live session on every call', async () => {
    const seen: { url: string; headers: Record<string, string> }[] = [];
    let session: Session = { ...emptySession('ja'), baseUrl: 'http://a', backend: 'hiaok', token: 't1' };
    const { resources } = createHttpGateways({
      session: () => session,
      fetch: (async (url: string, init: RequestInit) => { seen.push({ url, headers: init.headers as Record<string, string> }); return ok({ items: [] }); }) as unknown as typeof fetch,
    });
    await resources.list('role', {});
    session = { ...session, baseUrl: 'http://b', backend: 'ladepa', token: 't2', locale: 'zh' };
    await resources.list('role', {});
    expect(seen[0]).toMatchObject({ url: 'http://a/v1/api/hiaok/role/list', headers: { authorization: 'Bearer t1', 'accept-language': 'ja' } });
    expect(seen[1]).toMatchObject({ url: 'http://b/v1/api/ladepa/role/list', headers: { authorization: 'Bearer t2', 'accept-language': 'zh' } });
  });

  it('a 401 signs the user out of the whole app', async () => {
    const storage = memory();
    const app = createHiaokApp({
      store: new LocalSessionStore(storage),
      fetch: (async () => new Response(JSON.stringify({ code: 401, msg: 'nope', resultInfo: null }), { status: 401 })) as unknown as typeof fetch,
    });
    app.sessions.update({ token: 't', userUuid: 'u' });
    await expect(app.resources.list.execute({ name: 'role', scoped: false } as never, 0, 10)).rejects.toThrow();
    expect(app.sessions.isSignedIn()).toBe(false);
    expect(new SessionManager(new LocalSessionStore(storage)).get().token).toBeNull();
  });
});
