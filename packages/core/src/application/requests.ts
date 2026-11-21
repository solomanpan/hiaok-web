import type { ActionDef, FieldDef, ResourceDef, Row, Values } from '../domain/resources';
import type { Session } from '../domain/session';
import { coerce, collect } from './forms';

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

