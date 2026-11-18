/**
 * The permission-center resources as data. Both front ends (React and Nuxt) render every list, form and action
 * from this table, so a new hiaok endpoint is a few lines here, not a new page.
 *
 * Wire facts (hiaok): `POST /v1/api/hiaok/<name>/<action>`; list = `{orgUuid?, offset, limit}`; writes
 * (add / update / delete and most actions) are asynchronous and answer `accepted`; `user/register`,
 * `employee/add`, `user/change-password` and `user/authorities` answer directly.
 */
export type FieldType = 'text' | 'password' | 'number' | 'bool' | 'select' | 'date' | 'datetime' | 'multi';

export interface Option {
  value: string | number;
  label: string;
}

export interface RefDef {
  /** resource whose `list` supplies the options */
  resource: string;
  value: string;
  label: string;
}

export interface FieldDef {
  /** request field; dots build nested objects (`detail.legalName`) */
  name: string;
  type?: FieldType;
  required?: boolean;
  options?: Option[];
  ref?: RefDef;
  default?: string | number | boolean;
  /** pre-filled from the current session */
  session?: 'tenantUuid';
}

export type Values = Record<string, unknown>;
export type Row = Record<string, unknown>;

export interface ActionDef {
  key: string;
  /** endpoint segment, e.g. `grant-permissions` */
  endpoint: string;
  fields: FieldDef[];
  /** answers directly (no asynchronous outcome) */
  sync?: boolean;
  /** shows the result instead of "done" */
  showResult?: boolean;
  /** reshapes the form values into `reqInfo` (besides orgUuid / uuid) */
  build?: (values: Values) => Values;
  /** field name -> row field (dotted) that supplies its initial value */
  prefill?: Record<string, string>;
}

export interface ResourceDef {
  /** URL segment after the API prefix */
  name: string;
  /** the entity's own uuid in responses */
  idField: string;
  /** list needs an organization (everything except `organization`) */
  scoped: boolean;
  /** the organization is the entity: update / delete address it by `orgUuid` alone */
  selfOrg?: boolean;
  columns: string[];
  /** column that names a row (confirmations, tree labels) */
  nameField: string;
  create?: { fields: FieldDef[]; sync?: boolean };
  update?: { fields: FieldDef[] };
  remove?: boolean;
  actions?: ActionDef[];
  filters?: FieldDef[];
  tree?: boolean;
  /** row fields holding objects / JSON, shown in the detail view */
  detailFields?: string[];
}

const TYPE3: Option[] = [
  { value: 0, label: 'menu' },
  { value: 1, label: 'api' },
  { value: 2, label: 'button' },
];

/** Fixed enumerations that columns and selects show by name (hiaok: state 0 = enabled, 1 = disabled). */
export const ENUMS: Record<string, Option[]> = {
  state: [
    { value: 0, label: 'enabled' },
    { value: 1, label: 'disabled' },
  ],
  permType: TYPE3,
  menuType: TYPE3,
  roleType: [
    { value: 0, label: 'system' },
    { value: 1, label: 'custom' },
  ],
};

const meta: FieldDef[] = [{ name: 'description' }, { name: 'remark' }];
const tenant: FieldDef = {
  name: 'tenantUuid', required: true, session: 'tenantUuid',
  ref: { resource: 'tenant', value: 'tenantUuid', label: 'tenantName' },
};
const ref = (name: string, resource: string, value: string, label: string, required = false): FieldDef => ({
  name, required, ref: { resource, value, label },
});
const parent = (resource: string, value: string, label: string): FieldDef => ref('parentUuid', resource, value, label);
const DETAIL = ['legalName', 'registrationNo', 'address', 'postalCode', 'contactName', 'contactPhone', 'contactEmail', 'website'];

export const RESOURCES: ResourceDef[] = [
  {
    name: 'organization', idField: 'orgUuid', scoped: false, selfOrg: true, nameField: 'orgName', remove: true,
    columns: ['orgCode', 'orgName', 'state', 'createTime'],
    detailFields: ['detail'],
    create: {
      fields: [
        { name: 'orgCode', required: true }, { name: 'orgName', required: true }, ...meta,
        ...DETAIL.map((n) => ({ name: `detail.${n}` })),
      ],
    },
    update: { fields: [{ name: 'orgName' }, ...meta] },
    actions: [
      {
        key: 'updateDetail', endpoint: 'update-detail',
        fields: DETAIL.map((name) => ({ name })),
        prefill: Object.fromEntries(DETAIL.map((n) => [n, `detail.${n}`])),
      },
    ],
  },
  {
    name: 'tenant', idField: 'tenantUuid', scoped: true, nameField: 'tenantName', remove: true,
    columns: ['tenantCode', 'tenantName', 'expireTime', 'state'],
    create: { fields: [{ name: 'tenantCode', required: true }, { name: 'tenantName', required: true }, { name: 'expireTime', type: 'datetime' }, ...meta] },
    update: { fields: [{ name: 'tenantName' }, { name: 'expireTime', type: 'datetime' }, ...meta] },
  },
  {
    name: 'user', idField: 'userUuid', scoped: true, nameField: 'username', remove: true,
    columns: ['username', 'email', 'phone', 'state', 'lastLoginTime'],
    detailFields: ['detail', 'roles'],
    create: {
      sync: true,
      fields: [
        tenant, { name: 'username', required: true }, { name: 'password', type: 'password', required: true },
        { name: 'email' }, { name: 'phone' }, { name: 'nickname' },
        ref('groupUuid', 'group', 'groupUuid', 'groupName'),
        { name: 'roleUuids', type: 'multi', ref: { resource: 'role', value: 'roleUuid', label: 'roleName' } }, ...meta,
      ],
    },
    update: {
      fields: [
        { name: 'email' }, { name: 'phone' }, ref('groupUuid', 'group', 'groupUuid', 'groupName'),
        { name: 'detail.nickname' }, { name: 'detail.realName' }, { name: 'detail.avatarUrl' }, { name: 'detail.gender' },
        { name: 'detail.birthday', type: 'date' }, { name: 'detail.locale' }, { name: 'detail.timezone' }, ...meta,
      ],
    },
    actions: [
      {
        key: 'assignRoles', endpoint: 'assign-roles',
        fields: [{ name: 'roleUuids', type: 'multi', ref: { resource: 'role', value: 'roleUuid', label: 'roleName' } }],
        prefill: { roleUuids: 'roles' },
        build: (v) => ({ roles: ((v.roleUuids as string[]) ?? []).map((roleUuid) => ({ roleUuid, projectUuid: '' })) }),
      },
      { key: 'changePassword', endpoint: 'change-password', sync: true, fields: [{ name: 'newPassword', type: 'password', required: true }] },
      { key: 'authorities', endpoint: 'authorities', sync: true, showResult: true, fields: [{ name: 'projectUuid' }] },
    ],
  },
  {
    name: 'role', idField: 'roleUuid', scoped: true, nameField: 'roleName', remove: true,
    columns: ['roleCode', 'roleName', 'roleType', 'state'],
    create: {
      fields: [
        tenant, { name: 'roleCode', required: true }, { name: 'roleName', required: true },
        { name: 'roleType', type: 'select', default: 1, options: [{ value: 1, label: 'custom' }, { value: 0, label: 'system' }] }, ...meta,
      ],
    },
    update: { fields: [{ name: 'roleName' }, ...meta] },
    actions: [
      {
        key: 'grantPermissions', endpoint: 'grant-permissions', prefill: { permissionUuids: 'permissionUuids' },
        fields: [{ name: 'permissionUuids', type: 'multi', ref: { resource: 'permission', value: 'permissionUuid', label: 'permCode' } }],
      },
      {
        key: 'assignMenus', endpoint: 'assign-menus', prefill: { menuUuids: 'menuUuids' },
        fields: [{ name: 'menuUuids', type: 'multi', ref: { resource: 'menu', value: 'menuUuid', label: 'menuName' } }],
      },
    ],
  },
  {
    name: 'permission', idField: 'permissionUuid', scoped: true, nameField: 'permCode', remove: true,
    columns: ['permCode', 'permName', 'permType', 'resource', 'action', 'state'],
    create: {
      fields: [
        { name: 'permCode', required: true }, { name: 'permName', required: true },
        { name: 'permType', type: 'select', default: 0, options: TYPE3 }, { name: 'resource' }, { name: 'action' },
        ref('menuUuid', 'menu', 'menuUuid', 'menuName'), ...meta,
      ],
    },
    update: { fields: [{ name: 'permName' }, ref('menuUuid', 'menu', 'menuUuid', 'menuName'), ...meta] },
  },
  {
    name: 'menu', idField: 'menuUuid', scoped: true, nameField: 'menuName', remove: true, tree: true,
    columns: ['menuCode', 'menuName', 'menuType', 'path', 'sortOrder', 'visible', 'state'],
    create: {
      fields: [
        { name: 'menuCode', required: true }, { name: 'menuName', required: true },
        { name: 'menuType', type: 'select', default: 1, options: TYPE3 }, parent('menu', 'menuUuid', 'menuName'),
        { name: 'path' }, { name: 'component' }, { name: 'icon' }, { name: 'sortOrder', type: 'number', default: 0 },
        { name: 'visible', type: 'bool', default: true }, ...meta,
      ],
    },
    update: {
      fields: [{ name: 'menuName' }, { name: 'path' }, { name: 'component' }, { name: 'icon' }, { name: 'sortOrder', type: 'number' }, { name: 'visible', type: 'bool' }, ...meta],
    },
    actions: [{ key: 'move', endpoint: 'move', fields: [parent('menu', 'menuUuid', 'menuName')] }],
  },
  {
    name: 'project', idField: 'projectUuid', scoped: true, nameField: 'projectName', remove: true,
    columns: ['projectCode', 'projectName', 'ownerUserUuid', 'state'],
    create: { fields: [tenant, { name: 'projectCode', required: true }, { name: 'projectName', required: true }, ref('ownerUserUuid', 'user', 'userUuid', 'username'), ...meta] },
    update: { fields: [{ name: 'projectName' }, ref('ownerUserUuid', 'user', 'userUuid', 'username'), ...meta] },
  },
  {
    name: 'group', idField: 'groupUuid', scoped: true, nameField: 'groupName', remove: true, tree: true,
    columns: ['groupCode', 'groupName', 'parentGroupUuid', 'sortOrder', 'state'],
    create: {
      fields: [tenant, { name: 'groupCode', required: true }, { name: 'groupName', required: true }, ref('parentGroupUuid', 'group', 'groupUuid', 'groupName'), { name: 'sortOrder', type: 'number', default: 0 }, ...meta],
    },
    update: { fields: [{ name: 'groupName' }, { name: 'sortOrder', type: 'number' }, ...meta] },
    actions: [{ key: 'move', endpoint: 'move', fields: [parent('group', 'groupUuid', 'groupName')] }],
  },
  {
    name: 'department', idField: 'departmentUuid', scoped: true, nameField: 'departmentName', remove: true, tree: true,
    columns: ['departmentCode', 'departmentName', 'parentDepartmentUuid', 'employeeUuid', 'sortOrder', 'state'],
    create: {
      fields: [
        { name: 'departmentCode', required: true }, { name: 'departmentName', required: true },
        ref('parentDepartmentUuid', 'department', 'departmentUuid', 'departmentName'), { name: 'sortOrder', type: 'number', default: 0 }, ...meta,
      ],
    },
    update: { fields: [{ name: 'departmentName' }, { name: 'sortOrder', type: 'number' }, ...meta] },
    actions: [
      { key: 'move', endpoint: 'move', fields: [parent('department', 'departmentUuid', 'departmentName')] },
      { key: 'appointHead', endpoint: 'appoint-head', fields: [ref('employeeUuid', 'employee', 'employeeUuid', 'employeeName')] },
    ],
  },
  {
    name: 'employee', idField: 'employeeUuid', scoped: true, nameField: 'employeeName', remove: true,
    columns: ['employeeNo', 'employeeName', 'departmentUuid', 'position', 'hireDate', 'leaveDate', 'state'],
    create: {
      sync: true,
      fields: [
        { name: 'employeeNo', required: true }, { name: 'employeeName', required: true },
        ref('departmentUuid', 'department', 'departmentUuid', 'departmentName'),
        { name: 'email' }, { name: 'phone' }, { name: 'position' }, { name: 'hireDate', type: 'date' }, ...meta,
        { ...tenant, name: 'account.tenantUuid', required: false },
        { name: 'account.username' }, { name: 'account.password', type: 'password' },
      ],
    },
    update: { fields: [{ name: 'employeeName' }, { name: 'email' }, { name: 'phone' }, { name: 'position' }, ...meta] },
    actions: [
      { key: 'transfer', endpoint: 'transfer', fields: [ref('departmentUuid', 'department', 'departmentUuid', 'departmentName', true)] },
      { key: 'resign', endpoint: 'resign', fields: [{ name: 'leaveDate', type: 'date', required: true }] },
    ],
  },
  {
    name: 'config', idField: 'configUuid', scoped: true, nameField: 'configKey', remove: true,
    columns: ['configKey', 'configValue', 'valueType', 'configGroup', 'state'],
    create: {
      fields: [
        { name: 'configKey', required: true }, { name: 'configValue', required: true },
        { name: 'valueType', type: 'select', default: 'string', options: ['string', 'int', 'bool', 'json'].map((v) => ({ value: v, label: v })) },
        { name: 'configGroup' }, ...meta,
      ],
    },
    update: { fields: [{ name: 'configValue' }, ...meta] },
  },
  {
    name: 'log', idField: 'logUuid', scoped: true, nameField: 'eventType',
    columns: ['logType', 'eventType', 'aggregateId', 'traceId', 'occurredAt'],
    detailFields: ['content'],
    filters: [{ name: 'eventType' }],
  },
];

export const resourceByName = (name: string): ResourceDef => {
  const r = RESOURCES.find((x) => x.name === name);
  if (!r) throw new Error(`unknown resource ${name}`);
  return r;
};
