import { describe, expect, it } from 'vitest';
import {
  actionRequest, changes, createRequest, deleteRequest, formatCell, humanize, initialValues, label, listRequest,
  missingRequired, RESOURCES, resourceByName, updateRequest, emptySession, LoadFieldOptions, SessionManager, type Row, type ResourceGateway, type Session, type SessionStore,
} from '../index';

const session = { ...emptySession(), orgUuid: 'org-1', tenantUuid: 'ten-1' };
const res = resourceByName;

describe('the registry', () => {
  it('has a label in every language for every column, field and action', () => {
    const names = new Set<string>();
    for (const r of RESOURCES) {
      names.add(r.name);
      r.columns.forEach((c) => names.add(c));
      [...(r.create?.fields ?? []), ...(r.update?.fields ?? []), ...(r.filters ?? []), ...(r.actions ?? []).flatMap((a) => a.fields)].forEach((f) => names.add(f.name.split('.').pop()!));
      (r.actions ?? []).forEach((a) => names.add(a.key));
    }
    const missing = [...names].filter((n) => label('zh', n) === humanize(n) || label('ja', n) === humanize(n));
    expect(missing).toEqual([]);
  });

  it('covers every hiaok resource', () => {
    expect(RESOURCES.map((r) => r.name).sort()).toEqual(
      ['config', 'department', 'employee', 'group', 'log', 'menu', 'organization', 'permission', 'project', 'role', 'tenant', 'user'],
    );
  });
});

describe('requests', () => {
  it('lists inside the organization, with filters and paging; organizations are not scoped', () => {
    expect(listRequest(res('role'), session, 20, 10)).toEqual({ orgUuid: 'org-1', offset: 20, limit: 10 });
    expect(listRequest(res('organization'), session, 0, 20)).toEqual({ offset: 0, limit: 20 });
    expect(listRequest(res('log'), session, 0, 20, { eventType: ' UserRolesAssigned ' })).toMatchObject({ eventType: 'UserRolesAssigned' });
    expect(listRequest(res('log'), session, 0, 20, { eventType: '' })).not.toHaveProperty('eventType');
  });

  it('builds nested bodies and leaves empty fields and empty objects out', () => {
    const r = res('organization');
    const v = initialValues(r.create!.fields, session);
    Object.assign(v, { orgCode: 'ACME', orgName: 'Acme', 'detail.legalName': 'Acme Inc.', 'detail.website': '' });
    expect(createRequest(r, session, v)).toEqual({ orgCode: 'ACME', orgName: 'Acme', detail: { legalName: 'Acme Inc.' } });
    const bare = initialValues(r.create!.fields, session);
    Object.assign(bare, { orgCode: 'A', orgName: 'B' });
    expect(createRequest(r, session, bare)).toEqual({ orgCode: 'A', orgName: 'B' });
  });

  it('takes the tenant from the session and coerces numbers, booleans and selects', () => {
    const r = res('menu');
    const v = initialValues(r.create!.fields, session);
    expect(v.sortOrder).toBe(0);
    expect(v.visible).toBe(true);
    Object.assign(v, { menuCode: 'm', menuName: 'M', sortOrder: '5', menuType: '2', visible: 'false' });
    expect(createRequest(r, session, v)).toMatchObject({ orgUuid: 'org-1', menuCode: 'm', sortOrder: 5, menuType: 2, visible: false });
    expect(initialValues(res('role').create!.fields, session).tenantUuid).toBe('ten-1');
  });

  it('reports the first missing required field', () => {
    const f = res('user').create!.fields;
    const v = initialValues(f, session);
    expect(missingRequired(f, v)).toBe('username');
    Object.assign(v, { username: 'alice', password: 'secret-pass' });
    expect(missingRequired(f, v)).toBeNull();
  });

  it('updates send the uuid and only what changed', () => {
    const r = res('role');
    const row: Row = { orgUuid: 'org-1', roleUuid: 'r1', roleName: 'Old', description: 'same' };
    const initial = initialValues(r.update!.fields, session, row);
    const edited = { ...initial, roleName: 'New' };
    const diff = changes(r.update!.fields, initial, edited);
    expect(diff).toEqual({ roleName: 'New' });
    expect(updateRequest(r, session, row, diff)).toEqual({ orgUuid: 'org-1', uuid: 'r1', roleName: 'New' });
    expect(deleteRequest(r, session, row)).toEqual({ orgUuid: 'org-1', uuid: 'r1' });
  });

  it('addresses an organization by orgUuid alone', () => {
    const row: Row = { orgUuid: 'o9', orgName: 'X' };
    expect(updateRequest(res('organization'), session, row, { orgName: 'Y' })).toEqual({ orgUuid: 'o9', orgName: 'Y' });
    expect(deleteRequest(res('organization'), session, row)).toEqual({ orgUuid: 'o9' });
  });

  it('datetime-local values become ISO instants', () => {
    const r = res('tenant');
    const v = { ...initialValues(r.create!.fields, session), tenantCode: 'c', tenantName: 'n', expireTime: '2027-01-02T03:04' };
    expect(createRequest(r, session, v).expireTime).toBe(new Date('2027-01-02T03:04').toISOString());
  });
});

describe('actions', () => {
  const row: Row = { orgUuid: 'org-1', userUuid: 'u1', roles: [{ roleUuid: 'a', projectUuid: '' }, { roleUuid: 'b', projectUuid: 'p' }] };

  it('assign-roles prefills from the row and sends role assignments', () => {
    const a = res('user').actions!.find((x) => x.key === 'assignRoles')!;
    const v = initialValues(a.fields, session, row, a.prefill);
    expect(v.roleUuids).toEqual(['a', 'b']);
    expect(actionRequest(res('user'), a, session, row, { roleUuids: ['a'] })).toEqual({
      orgUuid: 'org-1', uuid: 'u1', roles: [{ roleUuid: 'a', projectUuid: '' }],
    });
  });

  it('grant-permissions sends the chosen uuids; an empty selection clears them', () => {
    const a = res('role').actions!.find((x) => x.key === 'grantPermissions')!;
    const r: Row = { orgUuid: 'org-1', roleUuid: 'r1', permissionUuids: ['p1'] };
    expect(initialValues(a.fields, session, r, a.prefill).permissionUuids).toEqual(['p1']);
    expect(actionRequest(res('role'), a, session, r, { permissionUuids: ['p1', 'p2'] })).toMatchObject({ permissionUuids: ['p1', 'p2'] });
  });

  it('update-detail is flat, as the API expects', () => {
    const a = res('organization').actions![0]!;
    const r: Row = { orgUuid: 'o9', detail: { legalName: 'Acme', website: null } };
    const v = initialValues(a.fields, session, r, a.prefill);
    expect(v.legalName).toBe('Acme');
    expect(actionRequest(res('organization'), a, session, r, { ...v, address: 'Tokyo' })).toEqual({ orgUuid: 'o9', legalName: 'Acme', address: 'Tokyo' });
  });
});

describe('display and options', () => {
  it('formats enums, booleans and timestamps', () => {
    expect(formatCell('zh', 'state', 0)).toBe('启用');
    expect(formatCell('en', 'state', 1)).toBe('Disabled');
    expect(formatCell('en', 'visible', true)).toBe('✓');
    expect(formatCell('en', 'createTime', null)).toBe('');
    expect(formatCell('en', 'content', { a: 1 })).toBe('{"a":1}');
    expect(formatCell('ja', 'permType', 1)).toBe('API');
  });

  it('loads select options from the referenced list, scoped to the organization', async () => {
    const calls: [string, object][] = [];
    const gateway = {
      list: async (resource: string, request: object) => {
        calls.push([resource, request]);
        return { items: [{ roleUuid: 'r1', roleName: 'Admin' }], total: 1, offset: 0, limit: 200 };
      },
    } as unknown as ResourceGateway;
    const store: SessionStore = { load: () => session as Session, save: () => undefined };
    const field = res('user').create!.fields.find((f) => f.name === 'roleUuids')!;
    expect(await new LoadFieldOptions(gateway, new SessionManager(store)).execute(field)).toEqual([{ value: 'r1', label: 'Admin' }]);
    expect(calls[0]).toEqual(['role', { orgUuid: 'org-1', offset: 0, limit: 200 }]);
  });
});
