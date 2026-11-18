import type { Client } from '@hiaok/api-client';
import { ENUMS, type ActionDef, type FieldDef, type Option, type ResourceDef, type Row, type Values } from './resources';
import type { Session } from './session';

// ---------------------------------------------------------------- nested paths ("detail.legalName")
export function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Row)[k] : undefined), obj);
}

export function setPath(obj: Values, path: string, value: unknown): void {
  const keys = path.split('.');
  let o = obj;
  keys.slice(0, -1).forEach((k) => {
    o = (o[k] ??= {}) as Values;
  });
  o[keys[keys.length - 1]!] = value;
}

function prune(v: Values): Values {
  for (const [k, x] of Object.entries(v)) {
    if (x && typeof x === 'object' && !Array.isArray(x)) {
      const inner = prune(x as Values);
      if (Object.keys(inner).length === 0) delete v[k];
    }
  }
  return v;
}

// ---------------------------------------------------------------- form values
/** The raw (form) value of a field taken from a row. */
function fromRow(f: FieldDef, source: unknown): unknown {
  if (f.type === 'multi') {
    if (!Array.isArray(source)) return [];
    return source.map((e) => {
      if (e && typeof e === 'object') {
        const key = Object.keys(e).find((k) => k.endsWith('Uuid'));
        return key ? (e as Row)[key] : e;
      }
      return e;
    });
  }
  if (f.type === 'datetime' && typeof source === 'string') return source.slice(0, 16); // datetime-local
  return source ?? '';
}

export function initialValues(fields: FieldDef[], session: Session, row?: Row, prefill?: Record<string, string>): Values {
  const out: Values = {};
  for (const f of fields) {
    if (row) out[f.name] = fromRow(f, getPath(row, prefill?.[f.name] ?? f.name));
    else if (f.session) out[f.name] = session[f.session] ?? '';
    else if (f.default !== undefined) out[f.name] = f.default;
    else out[f.name] = f.type === 'multi' ? [] : '';
  }
  return out;
}

/** Form value -> wire value; `undefined` = leave the field out. */
export function coerce(f: FieldDef, raw: unknown): unknown {
  if (raw === undefined || raw === null || raw === '') return undefined;
  switch (f.type) {
    case 'number': {
      const n = Number(raw);
      return Number.isFinite(n) ? n : undefined;
    }
    case 'bool':
      return typeof raw === 'boolean' ? raw : raw === 'true';
    case 'select': {
      const opt = f.options?.find((o) => String(o.value) === String(raw));
      return opt ? opt.value : raw;
    }
    case 'datetime': {
      const d = new Date(String(raw));
      return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
    }
    case 'multi':
      return Array.isArray(raw) ? raw : undefined;
    default:
      return typeof raw === 'string' ? raw.trim() || undefined : raw;
  }
}

/** Form values -> nested `reqInfo` fragment (empty fields and empty objects are left out). */
export function collect(fields: FieldDef[], values: Values): Values {
  const out: Values = {};
  for (const f of fields) {
    const v = coerce(f, values[f.name]);
    if (v !== undefined) setPath(out, f.name, v);
  }
  return prune(out);
}

/** Only what changed against the initial form (an update sends no untouched field). */
export function changes(fields: FieldDef[], initial: Values, values: Values): Values {
  const changed = fields.filter((f) => JSON.stringify(coerce(f, initial[f.name])) !== JSON.stringify(coerce(f, values[f.name])));
  return collect(changed, values);
}

/** Name of the first required field that is empty, or null. */
export function missingRequired(fields: FieldDef[], values: Values): string | null {
  return fields.find((f) => f.required && coerce(f, values[f.name]) === undefined)?.name ?? null;
}

// ---------------------------------------------------------------- requests
const org = (res: ResourceDef, session: Session, row?: Row): Values =>
  res.scoped || res.selfOrg ? { orgUuid: (row?.orgUuid as string) || session.orgUuid } : {};

export function listRequest(res: ResourceDef, session: Session, offset: number, limit: number, filters: Values = {}): Values {
  return { ...(res.scoped ? { orgUuid: session.orgUuid } : {}), offset, limit, ...collect(res.filters ?? [], filters) };
}

export function createRequest(res: ResourceDef, session: Session, values: Values): Values {
  return { ...(res.scoped ? { orgUuid: session.orgUuid } : {}), ...collect(res.create?.fields ?? [], values) };
}

const key = (res: ResourceDef, row: Row): Values => (res.selfOrg ? {} : { uuid: row[res.idField] });

export function updateRequest(res: ResourceDef, session: Session, row: Row, changed: Values): Values {
  return { ...org(res, session, row), ...key(res, row), ...changed };
}

export function deleteRequest(res: ResourceDef, session: Session, row: Row): Values {
  return { ...org(res, session, row), ...key(res, row) };
}

/** Coerced values by field name (flat), so `build` sees numbers and arrays rather than form strings. */
function collectFlat(fields: FieldDef[], values: Values): Values {
  const out: Values = {};
  for (const f of fields) {
    const v = coerce(f, values[f.name]);
    if (v !== undefined) out[f.name] = v;
  }
  return out;
}

export function actionRequest(res: ResourceDef, action: ActionDef, session: Session, row: Row, values: Values): Values {
  const body = action.build ? action.build(collectFlat(action.fields, values)) : collect(action.fields, values);
  return { ...org(res, session, row), ...key(res, row), ...body };
}

// ---------------------------------------------------------------- calls
export interface TreeNode {
  item: Row;
  children: TreeNode[];
}

export interface RowPage {
  items: Row[];
  total: number;
  offset: number;
  limit: number;
}

export const listRows = (client: Client, res: ResourceDef, session: Session, offset: number, limit: number, filters?: Values) =>
  client.call<RowPage>(res.name, 'list', listRequest(res, session, offset, limit, filters));

export const loadTree = (client: Client, res: ResourceDef, session: Session) =>
  client.call<TreeNode[]>(res.name, 'tree', { orgUuid: session.orgUuid });

/** Creates a row. Synchronous creates (user, employee) answer with the entity; the others are asynchronous. */
export async function createRow(client: Client, res: ResourceDef, session: Session, values: Values): Promise<unknown> {
  const req = createRequest(res, session, values);
  if (res.create?.sync) return client.call(res.name, res.name === 'user' ? 'register' : 'add', req);
  return (await client.write(res.name, 'add', req)).outcome;
}

export async function updateRow(client: Client, res: ResourceDef, session: Session, row: Row, changed: Values) {
  return (await client.write(res.name, 'update', updateRequest(res, session, row, changed))).outcome;
}

export async function deleteRow(client: Client, res: ResourceDef, session: Session, row: Row) {
  return (await client.write(res.name, 'delete', deleteRequest(res, session, row))).outcome;
}

export async function runAction(client: Client, res: ResourceDef, action: ActionDef, session: Session, row: Row, values: Values): Promise<unknown> {
  const req = actionRequest(res, action, session, row, values);
  if (action.sync) return client.call(res.name, action.endpoint, req);
  return (await client.write(res.name, action.endpoint, req)).outcome;
}

/** Options of a field: its fixed options, or the referenced resource's list (first 200). */
export async function loadOptions(client: Client, field: FieldDef, session: Session): Promise<Option[]> {
  if (field.options) return field.options;
  const r = field.ref;
  if (!r) return [];
  const page = await client.call<RowPage>(r.resource, 'list', { orgUuid: session.orgUuid, offset: 0, limit: 200 });
  return page.items.map((row) => ({ value: String(row[r.value]), label: String(row[r.label] ?? row[r.value]) }));
}

/** Organizations for the sign-in screen (the list is open on hiaok). */
export const listOrganizations = (client: Client) =>
  client.call<RowPage>('organization', 'list', { offset: 0, limit: 200 });

export const listTenants = (client: Client, orgUuid: string) =>
  client.call<RowPage>('tenant', 'list', { orgUuid, offset: 0, limit: 200 });

export const enumLabelKey = (column: string, value: unknown): string | undefined =>
  ENUMS[column]?.find((o) => String(o.value) === String(value))?.label;
