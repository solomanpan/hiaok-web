import { describe, expect, it } from 'vitest';
import { Access, emptySession, isSignedIn, resourceByName, signedOut } from '../index';

describe('session', () => {
  it('is signed in with a token, or with a known user when the server has auth off', () => {
    expect(isSignedIn(emptySession())).toBe(false);
    expect(isSignedIn({ ...emptySession(), token: 't' })).toBe(true);
    expect(isSignedIn({ ...emptySession(), userUuid: 'u' })).toBe(true);
  });
  it('signing out keeps the server settings and the language, drops credentials and identity', () => {
    const s = { ...emptySession('ja'), baseUrl: 'http://x', backend: 'ladepa' as const, token: 't', orgUuid: 'o', tenantUuid: 't1', userUuid: 'u' };
    expect(signedOut(s)).toEqual({ ...emptySession('ja'), baseUrl: 'http://x', backend: 'ladepa' });
  });
});

describe('access', () => {
  const principal = (...permissionCodes: string[]) => new Access({ userUuid: 'u', orgUuid: 'o', tenantUuid: 't', roleCodes: [], permissionCodes });
  const role = resourceByName('role');
  const user = resourceByName('user');

  it('guarded resources follow the permission codes the server checks', () => {
    expect(principal('role:list').can(role, 'list')).toBe(true);
    expect(principal('role:list').can(role, 'delete')).toBe(false);
    expect(principal('role:*').can(role, 'grant-permissions')).toBe(true);
    expect(principal('*').can(role, 'delete')).toBe(true);
    expect(principal().canOpen(role)).toBe(false);
    expect(principal('menu:tree').canOpen(resourceByName('menu'))).toBe(true);
  });
  it('unguarded resources and a missing principal hide nothing', () => {
    expect(principal().can(user, 'delete')).toBe(true);
    expect(Access.everything.can(role, 'delete')).toBe(true);
  });
});
