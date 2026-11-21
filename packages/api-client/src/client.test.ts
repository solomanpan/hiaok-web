import { describe, expect, it, vi } from 'vitest';
import { ApiError, createClient } from './index';

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function setup(responses: unknown[]) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const next = responses.shift();
    return next instanceof Response ? next : reply(next);
  });
  const onUnauthenticated = vi.fn();
  const client = createClient({
    baseUrl: 'http://api.test/', getToken: () => 'tok', getLocale: () => 'zh',
    fetch: fetchMock as unknown as typeof fetch, onUnauthenticated,
  });
  return { client, calls, onUnauthenticated };
}

const body = (c: { init: RequestInit }) => JSON.parse(String(c.init.body));

describe('call', () => {
  it('posts the envelope with auth, locale and request id headers', async () => {
    const { client, calls } = setup([{ code: 0, msg: 'success', resultInfo: { items: [], total: 0, offset: 0, limit: 20 } }]);
    const page = await client.roles.list('org1', { limit: 5 });
    expect(page.total).toBe(0);
    const [c] = calls;
    expect(c!.url).toBe('http://api.test/v1/api/hiaok/role/list');
    const headers = c!.init.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer tok');
    expect(headers['accept-language']).toBe('zh');
    expect(body(c!).reqInfo).toEqual({ orgUuid: 'org1', limit: 5 });
    expect(body(c!).requestId).toBe(headers['x-request-id']);
  });

  it('turns a business error into ApiError', async () => {
    const { client } = setup([{ code: 404, msg: '角色 \'x\' 不存在', resultInfo: null, errorCode: 'role_not_found' }]);
    const err = await client.roles.get('o', 'x').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: 404, errorCode: 'role_not_found', message: "角色 'x' 不存在" });
  });

  it('reports 401 to the callback', async () => {
    const { client, onUnauthenticated } = setup([{ code: 401, msg: 'authentication required', resultInfo: null, errorCode: 'unauthenticated' }]);
    await expect(client.auth.me()).rejects.toMatchObject({ isUnauthenticated: true });
    expect(onUnauthenticated).toHaveBeenCalledOnce();
  });

  it('wraps network failures and non-JSON answers', async () => {
    const down = createClient({ fetch: (async () => { throw new TypeError('offline'); }) as unknown as typeof fetch });
    await expect(down.auth.me()).rejects.toMatchObject({ code: 0, errorCode: 'network_error' });
    const { client } = setup([new Response('<html>', { status: 502 })]);
    await expect(client.auth.me()).rejects.toMatchObject({ code: 502, errorCode: 'bad_response' });
  });
});

describe('asynchronous writes', () => {
  const accepted = { code: 0, msg: 'success', resultInfo: { requestId: 'r', uuid: 'new-uuid', status: 'accepted' } };
  const out = (status: string, extra = {}) => ({ code: 0, msg: 'success', resultInfo: { requestId: 'r', status, code: 0, ...extra } });

  it('polls log/get-by-request until the command succeeded', async () => {
    const { client, calls } = setup([accepted, out('pending'), out('pending'), out('success')]);
    const r = await client.roles.add({ orgUuid: 'o', tenantUuid: 't', roleCode: 'x', roleName: 'X' }, { intervalMs: 1 });
    expect(r.uuid).toBe('new-uuid');
    expect(r.outcome.status).toBe('success');
    expect(calls.map((c) => c.url.split('/').slice(-2).join('/'))).toEqual(['role/add', 'log/get-by-request', 'log/get-by-request', 'log/get-by-request']);
    expect(body(calls[1]!).reqInfo).toEqual({ orgUuid: 'o', targetRequestId: body(calls[0]!).requestId });
  });

  it('looks organization commands up under the new organization uuid', async () => {
    const { client, calls } = setup([accepted, out('success')]);
    await client.organizations.add({ orgCode: 'c', orgName: 'n' }, { intervalMs: 1 });
    expect(body(calls[1]!).reqInfo.orgUuid).toBe('new-uuid');
  });

  it('rejects with the recorded business error when the command failed', async () => {
    const { client } = setup([accepted, out('failed', { code: 409, msg: 'exists', errorCode: 'duplicate_org_code' })]);
    await expect(client.organizations.add({ orgCode: 'c', orgName: 'n' }, { intervalMs: 1 })).rejects.toMatchObject({
      code: 409, errorCode: 'duplicate_org_code',
    });
  });

  it('times out while the command stays pending', async () => {
    const { client } = setup([accepted, ...Array.from({ length: 50 }, () => out('pending'))]);
    await expect(client.roles.delete('o', 'u', { timeoutMs: 20, intervalMs: 5 })).rejects.toMatchObject({ errorCode: 'outcome_timeout' });
  });
});

describe('captcha', () => {
  it('fetches a challenge and sends the answer with login', async () => {
    const { client, calls } = setup([
      { code: 0, msg: 'success', resultInfo: { required: true, captchaId: 'c1', image: 'data:image/svg+xml;base64,AAA', expiresIn: 120 } },
      { code: 0, msg: 'success', resultInfo: { accessToken: 't', tokenType: 'Bearer', expiresIn: 7200, userUuid: 'u' } },
    ]);
    const c = await client.auth.captcha();
    expect(c.required && c.captchaId).toBe('c1');
    await client.auth.login({ orgUuid: 'o', tenantUuid: 't', username: 'a', password: 'p', captchaId: c.captchaId!, captchaCode: 'AB12' });
    expect(calls[0]!.url).toMatch(/auth\/captcha$/);
    expect(body(calls[1]!).reqInfo).toMatchObject({ captchaId: 'c1', captchaCode: 'AB12' });
  });

  it('reports a wrong captcha as a business error', async () => {
    const { client } = setup([{ code: 400, msg: 'bad', resultInfo: null, errorCode: 'captcha_invalid' }]);
    await expect(client.auth.login({ orgUuid: 'o', tenantUuid: 't', username: 'a', password: 'p' })).rejects.toMatchObject({ errorCode: 'captcha_invalid' });
  });
});

describe('live options', () => {
  it('the server URL and prefix are read on every call', async () => {
    const urls: string[] = [];
    const o = { baseUrl: 'http://a', prefix: '/v1/api/hiaok' };
    const client = createClient({
      get baseUrl() { return o.baseUrl; },
      get prefix() { return o.prefix; },
      fetch: (async (u: string) => { urls.push(u); return new Response(JSON.stringify({ code: 0, msg: 'ok', resultInfo: {} })); }) as unknown as typeof fetch,
    });
    await client.call('role', 'list', {});
    o.baseUrl = 'http://b/'; o.prefix = '/v1/api/ladepa';
    await client.call('role', 'list', {});
    expect(urls).toEqual(['http://a/v1/api/hiaok/role/list', 'http://b/v1/api/ladepa/role/list']);
  });
});
