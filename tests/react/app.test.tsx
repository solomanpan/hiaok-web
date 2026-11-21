// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../apps/app/src/App';

const ok = (resultInfo: unknown) => new Response(JSON.stringify({ code: 0, msg: 'success', resultInfo }));
const calls: { url: string; body: any }[] = [];
const saved = { baseUrl: '', backend: 'hiaok', token: 'tok', orgUuid: 'o1', tenantUuid: 't1', userUuid: 'u1', locale: 'en' };

beforeEach(() => {
  localStorage.clear(); calls.length = 0;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body ?? '{}'));
    calls.push({ url, body });
    if (url.endsWith('/auth/captcha')) return ok({ required: true, captchaId: 'c1', image: 'data:image/svg+xml;base64,AAA', expiresIn: 120 });
    if (url.endsWith('/organization/list')) return ok({ items: [{ orgUuid: 'o1', orgName: 'Acme', orgCode: 'ACME' }], total: 1, offset: 0, limit: 200 });
    if (url.endsWith('/tenant/list')) return ok({ items: [{ tenantUuid: 't1', tenantName: 'Main', tenantCode: 'MAIN' }], total: 1, offset: 0, limit: 200 });
    if (url.endsWith('/auth/login')) return ok({ accessToken: 'tok', tokenType: 'Bearer', expiresIn: 7200, userUuid: 'u1' });
    if (url.endsWith('/auth/me')) return ok({ userUuid: 'u1', orgUuid: 'o1', tenantUuid: 't1', roleCodes: [], permissionCodes: ['role:list', 'role:add'] });
    if (url.endsWith('/auth/logout')) return ok({});
    if (url.endsWith('/role/list')) return ok({ items: [{ roleUuid: 'r1', roleCode: 'admin', roleName: 'Admin', roleType: 0, state: 0 }], total: 1, offset: 0, limit: 20 });
    return ok({ items: [], total: 0, offset: 0, limit: 20 });
  }));
});
afterEach(cleanup);

const press = (el: Element) => fireEvent.click(el);
const type = (input: Element, value: string) => fireEvent.change(input, { target: { value } });

describe('sign in', () => {
  it('shows the captcha, logs in with it and lands on the resource list', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByLabelText('Refresh captcha')).toBeTruthy());
    // organization and tenant come from the lists: pick them
    await waitFor(() => expect(screen.getAllByText('Select…').length).toBeGreaterThan(0));
    press(screen.getAllByText('Select…')[0]!);
    press(await screen.findByText(/Acme/));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/tenant/list') && c.body.reqInfo.orgUuid === 'o1')).toBe(true));
    await waitFor(() => expect(screen.queryAllByText('Select…')).toHaveLength(1)); // the org dialog is closed, the tenant list is in
    press(screen.getByText('Select…'));
    press(await screen.findByText(/Main/));

    const inputs = Array.from(document.querySelectorAll('input'));
    type(inputs.find((x) => x.autocomplete === 'username')!, 'alice');
    type(inputs.find((x) => x.type === 'password')!, 'secret-pass');
    type(inputs.find((x) => x.getAttribute('autocapitalize') === 'characters')!, 'ab12');
    press(screen.getAllByText('Sign in').at(-1)!);

    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/auth/login'))).toBe(true));
    const login = calls.find((c) => c.url.endsWith('/auth/login'))!;
    expect(login.body.reqInfo).toMatchObject({ orgUuid: 'o1', tenantUuid: 't1', username: 'alice', captchaId: 'c1', captchaCode: 'ab12' });
    expect(JSON.parse(localStorage.getItem('hiaok-web.session')!).token).toBe('tok');
  });

  it('lists a resource once signed in and sends the organization', async () => {
    localStorage.setItem('hiaok-web.session', JSON.stringify(saved));
    render(<App />);
    await waitFor(() => expect(screen.getByText('Admin')).toBeTruthy());
    const list = calls.find((c) => c.url.endsWith('/role/list'))!;
    expect(list.body.reqInfo).toMatchObject({ orgUuid: 'o1', offset: 0, limit: 20 });
    expect(screen.getByText('Enabled')).toBeTruthy();
  });

  it('hides what the user may not do, and signing out calls the server', async () => {
    localStorage.setItem('hiaok-web.session', JSON.stringify(saved));
    render(<App />);
    await waitFor(() => expect(screen.getByText('Admin')).toBeTruthy());
    await waitFor(() => expect(screen.queryByText('Delete')).toBeNull());      // no role:delete
    expect(screen.getByText('+ Add')).toBeTruthy();                            // role:add
    press(screen.getByText('☰'));                                              // jsdom is "narrow": the menu is a drawer
    expect(screen.getAllByText('Role').length).toBeGreaterThan(0);
    expect(screen.queryByText('Menu')).toBeNull();                             // no menu:* code
    press(screen.getByText('Sign out'));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/auth/logout'))).toBe(true));
    await waitFor(() => expect(JSON.parse(localStorage.getItem('hiaok-web.session')!).token).toBeNull());
  });
});
