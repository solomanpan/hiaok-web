import { describe, expect, it } from 'vitest';
import {
  createApp, emptySession, resourceByName, SessionManager,
  type AuthGateway, type ResourceGateway, type Session, type SessionStore,
} from '@hiaok/core';

function setup(over: { auth?: Partial<AuthGateway>; resources?: Partial<ResourceGateway> } = {}) {
  const saved: Session[] = [];
  const store: SessionStore = { load: () => ({ ...emptySession(), baseUrl: 'http://s' }), save: (s) => void saved.push(s) };
  const calls: string[] = [];
  const auth = {
    captcha: async () => ({ required: true, captchaId: 'c1', image: 'img' }),
    login: async (c) => { calls.push(`login ${c.username} ${c.captchaCode}`); return { accessToken: 'tok', userUuid: 'u1' }; },
    register: async () => ({}),
    logout: async () => { calls.push('logout'); },
    me: async () => ({ userUuid: 'u9', orgUuid: 'o9', tenantUuid: 't9', roleCodes: [], permissionCodes: ['role:list'] }),
    ...over.auth,
  } as AuthGateway;
  const resources = { list: async () => ({ items: [], total: 0, offset: 0, limit: 20 }), ...over.resources } as ResourceGateway;
  const sessions = new SessionManager(store);
  return { app: createApp({ auth, resources, sessions }), sessions, saved, calls };
}

describe('sign in / out', () => {
  it('signing in stores the token and the chosen organization, and persists it', async () => {
    const { app, sessions, saved } = setup();
    await app.auth.signIn.execute({ orgUuid: 'o1', tenantUuid: 't1', username: 'alice', password: 'x', captchaId: 'c1', captchaCode: 'AB12' });
    expect(sessions.get()).toMatchObject({ token: 'tok', orgUuid: 'o1', tenantUuid: 't1', userUuid: 'u1', baseUrl: 'http://s' });
    expect(saved.at(-1)?.token).toBe('tok');
    expect(sessions.isSignedIn()).toBe(true);
  });

  it('a failed sign in leaves the session untouched', async () => {
    const { app, sessions } = setup({ auth: { login: async () => { throw new Error('captcha_invalid'); } } });
    await expect(app.auth.signIn.execute({ orgUuid: 'o', tenantUuid: 't', username: 'a', password: 'b' })).rejects.toThrow('captcha_invalid');
    expect(sessions.isSignedIn()).toBe(false);
  });

  it('signing out ends the session on the server too, and still clears locally when the server is down', async () => {
    const a = setup();
    await a.app.auth.signIn.execute({ orgUuid: 'o', tenantUuid: 't', username: 'a', password: 'b' });
    await a.app.auth.signOut.execute();
    expect(a.calls).toContain('logout');
    expect(a.sessions.get()).toMatchObject({ token: null, userUuid: '', baseUrl: 'http://s' });

    const b = setup({ auth: { logout: async () => { throw new Error('offline'); } } });
    await b.app.auth.signIn.execute({ orgUuid: 'o', tenantUuid: 't', username: 'a', password: 'b' });
    await b.app.auth.signOut.execute();
    expect(b.sessions.isSignedIn()).toBe(false);
  });

  it('with auth off it adopts the identity the server reports, unless the user chose one', async () => {
    const { app, sessions } = setup();
    await app.auth.enterWithoutAuth.execute({ orgUuid: 'mine' });
    expect(sessions.get()).toMatchObject({ token: null, orgUuid: 'mine', tenantUuid: 't9', userUuid: 'u9' });
  });

  it('listeners hear about every change', async () => {
    const { app, sessions } = setup();
    let n = 0;
    const off = sessions.subscribe(() => n++);
    await app.auth.signIn.execute({ orgUuid: 'o', tenantUuid: 't', username: 'a', password: 'b' });
    sessions.signOut();
    off();
    sessions.update({ orgUuid: 'x' });
    expect(n).toBe(2);
  });
});

describe('sign-in choices and access', () => {
  it('turns organizations and tenants into labelled choices; failures mean "type the UUID"', async () => {
    const { app } = setup({
      resources: {
        list: async (resource: string) => resource === 'organization'
          ? { items: [{ orgUuid: 'o1', orgName: 'Acme', orgCode: 'ACME' }], total: 1, offset: 0, limit: 200 }
          : { items: [{ tenantUuid: 't1', tenantName: 'Main', tenantCode: 'MAIN' }], total: 1, offset: 0, limit: 200 },
      },
    });
    expect(await app.auth.choices.organizations()).toEqual([{ value: 'o1', label: 'Acme (ACME)' }]);
    expect(await app.auth.choices.tenants('o1')).toEqual([{ value: 't1', label: 'Main (MAIN)' }]);
    expect(await app.auth.choices.tenants('')).toEqual([]);
    const down = setup({ resources: { list: async () => { throw new Error('x'); } } });
    expect(await down.app.auth.choices.organizations()).toEqual([]);
  });

  it('loads the principal into an Access; hides nothing when the server cannot say', async () => {
    const a = await setup().app.auth.access.execute();
    expect(a.canOpen(resourceByName('role'))).toBe(true);
    expect(a.canOpen(resourceByName('menu'))).toBe(false);
    const b = await setup({ auth: { me: async () => { throw new Error('401'); } } }).app.auth.access.execute();
    expect(b.canOpen(resourceByName('menu'))).toBe(true);
  });
});

describe('resource use cases', () => {
  it('builds the requests from the session, reads and writes through the gateway', async () => {
    const seen: [string, string, object][] = [];
    const { app, sessions } = setup({
      resources: {
        list: async (r: string, q: object) => { seen.push([r, 'list', q]); return { items: [], total: 0, offset: 0, limit: 20 }; },
        get: async (r: string, e: string, q: object) => { seen.push([r, e, q]); return {}; },
        write: async (r: string, e: string, q: object) => { seen.push([r, e, q]); return { requestId: 'x', status: 'success' as const }; },
        call: (async (r: string, e: string, q: object) => { seen.push([r, e, q]); return {}; }) as ResourceGateway['call'],
      },
    });
    sessions.update({ orgUuid: 'o1', tenantUuid: 't1' });
    const role = resourceByName('role');
    const row = { roleUuid: 'r1', orgUuid: 'o1' };
    await app.resources.list.execute(role, 0, 20);
    await app.resources.get.execute(role, row);
    await app.resources.configByKey.execute('site.name');
    await app.resources.update.execute(role, row, { roleName: 'New' });
    await app.resources.remove.execute(role, row);
    await app.resources.runAction.execute(role, role.actions!.find((a) => a.endpoint === 'grant-permissions')!, row, { permissionUuids: ['p1'] });
    await app.resources.create.execute(resourceByName('user'), { username: 'alice', password: 'secret-pass', roleUuids: [] });
    expect(seen).toEqual([
      ['role', 'list', { orgUuid: 'o1', offset: 0, limit: 20 }],
      ['role', 'get', { orgUuid: 'o1', uuid: 'r1' }],
      ['config', 'get-by-key', { orgUuid: 'o1', configKey: 'site.name' }],
      ['role', 'update', { orgUuid: 'o1', uuid: 'r1', roleName: 'New' }],
      ['role', 'delete', { orgUuid: 'o1', uuid: 'r1' }],
      ['role', 'grant-permissions', expect.objectContaining({ orgUuid: 'o1', uuid: 'r1', permissionUuids: ['p1'] })],
      ['user', 'register', expect.objectContaining({ orgUuid: 'o1', username: 'alice' })],
    ]);
  });
});
