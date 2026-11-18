// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const ok = (resultInfo: unknown) => new Response(JSON.stringify({ code: 0, msg: 'success', resultInfo }));
const calls: { url: string; body: any }[] = [];

beforeEach(() => {
  localStorage.clear(); location.hash = '#/login'; calls.length = 0;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body ?? '{}'));
    calls.push({ url, body });
    if (url.endsWith('/auth/captcha')) return ok({ required: true, captchaId: 'c1', image: 'data:image/svg+xml;base64,AAA', expiresIn: 120 });
    if (url.endsWith('/organization/list')) return ok({ items: [{ orgUuid: 'o1', orgName: 'Acme', orgCode: 'ACME' }], total: 1, offset: 0, limit: 200 });
    if (url.endsWith('/tenant/list')) return ok({ items: [{ tenantUuid: 't1', tenantName: 'Main', tenantCode: 'MAIN' }], total: 1, offset: 0, limit: 200 });
    if (url.endsWith('/auth/login')) return ok({ accessToken: 'tok', tokenType: 'Bearer', expiresIn: 7200, userUuid: 'u1' });
    if (url.endsWith('/role/list')) return ok({ items: [{ roleUuid: 'r1', roleCode: 'admin', roleName: 'Admin', roleType: 0, state: 0 }], total: 1, offset: 0, limit: 20 });
    return ok({ items: [], total: 0, offset: 0, limit: 20 });
  }));
});
afterEach(cleanup);

describe('sign in', () => {
  it('shows the captcha, logs in with it and lands on the resource list', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByAltText(/captcha|验证码/i)).toBeTruthy());
    await waitFor(() => expect(screen.getAllByRole('combobox').length).toBeGreaterThan(2)); // orgs loaded
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[2]!, { target: { value: 'o1' } });
    await waitFor(() => expect(screen.getAllByRole('combobox').length).toBeGreaterThan(3));
    fireEvent.change(screen.getAllByRole('combobox')[3]!, { target: { value: 't1' } });
    const inputs = document.querySelectorAll('input');
    const text = (i: number, v: string) => fireEvent.change(inputs[i]!, { target: { value: v } });
    const find = (type: string) => Array.from(inputs).findIndex((x) => x.type === type);
    text(find('password'), 'secret-pass');
    const user = Array.from(inputs).findIndex((x) => x.autocomplete === 'username');
    text(user, 'alice');
    const code = Array.from(inputs).findIndex((x) => x.autocomplete === 'off');
    text(code, 'ab12');
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/auth/login'))).toBe(true));
    const login = calls.find((c) => c.url.endsWith('/auth/login'))!;
    expect(login.body.reqInfo).toMatchObject({ orgUuid: 'o1', tenantUuid: 't1', username: 'alice', captchaId: 'c1', captchaCode: 'ab12' });
    expect(JSON.parse(localStorage.getItem('hiaok-web.session')!).token).toBe('tok');
  });

  it('lists a resource once signed in and sends the organization', async () => {
    localStorage.setItem('hiaok-web.session', JSON.stringify({ baseUrl: '', backend: 'hiaok', token: 'tok', orgUuid: 'o1', tenantUuid: 't1', userUuid: 'u1', locale: 'en' }));
    location.hash = '#/r/role';
    render(<App />);
    await waitFor(() => expect(screen.getByText('Admin')).toBeTruthy());
    const list = calls.find((c) => c.url.endsWith('/role/list'))!;
    expect(list.body.reqInfo).toMatchObject({ orgUuid: 'o1', offset: 0, limit: 20 });
    expect(screen.getByText('Enabled')).toBeTruthy();
  });
});
