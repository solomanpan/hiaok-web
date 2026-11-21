import type { FieldDef, Row, Values } from '../domain/resources';
import type { Session } from '../domain/session';

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

