import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { loadOptions, missingRequired, type FieldDef, type Option, type Values } from '@hiaok/shared';
import { errorText, useApp } from './state';

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const { t } = useApp();
  return (
    <div className="modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" role="dialog" aria-label={title}>
        <h1>{title}</h1>
        {children}
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" onClick={onClose}>{t('close')}</button>
        </div>
      </div>
    </div>
  );
}

function FieldInput({ f, value, onChange, options }: { f: FieldDef; value: unknown; onChange: (v: unknown) => void; options: Option[] }) {
  const { t, l } = useApp();
  const type = f.type ?? 'text';
  const opt = (o: Option) => <option key={o.value} value={String(o.value)}>{enumLabel(o)}</option>;
  const enumLabel = (o: Option) => (f.options ? l(o.label) : o.label);
  if (type === 'bool')
    return <input type="checkbox" style={{ width: 'auto' }} checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />;
  if (type === 'select')
    return (
      <select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} required={f.required}>
        <option value="">{t('pick')}</option>
        {options.map(opt)}
      </select>
    );
  if (type === 'multi') {
    const picked = Array.isArray(value) ? (value as string[]) : [];
    return (
      <select multiple size={Math.min(6, Math.max(3, options.length))} value={picked}
        onChange={(e) => onChange(Array.from(e.target.selectedOptions, (o) => o.value))}>
        {options.map(opt)}
      </select>
    );
  }
  const html = type === 'password' ? 'password' : type === 'number' ? 'number' : type === 'date' ? 'date' : type === 'datetime' ? 'datetime-local' : 'text';
  return <input type={html} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} required={f.required}
    autoComplete={type === 'password' ? 'new-password' : 'off'} />;
}

/** A form generated from field definitions; `onSubmit` receives the raw values (callers build the request). */
export function FormDialog({ title, fields, initial, onSubmit, onClose, submitLabel }: {
  title: string; fields: FieldDef[]; initial: Values; submitLabel?: string;
  onSubmit: (values: Values) => Promise<unknown>; onClose: () => void;
}) {
  const { client, session, t, l } = useApp();
  const [values, setValues] = useState<Values>(initial);
  const [options, setOptions] = useState<Record<string, Option[]>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    fields.filter((f) => f.ref || f.options).forEach((f) => {
      loadOptions(client, f, session).then((o) => live && setOptions((p) => ({ ...p, [f.name]: o }))).catch(() => undefined);
    });
    return () => { live = false; };
  }, [client, session, fields]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const missing = missingRequired(fields, values);
    if (missing) { setError(`${t('fieldRequired')}: ${l(missing)}`); return; }
    setBusy(true); setError('');
    try { await onSubmit(values); onClose(); }
    catch (err) { setError(errorText(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <form className="card" onSubmit={submit}>
        <h1>{title}</h1>
        {fields.map((f) => (
          <label className="field" key={f.name}>
            <span>{l(f.name)}{f.required ? ' *' : ''}</span>
            <FieldInput f={f} value={values[f.name]} options={options[f.name] ?? []}
              onChange={(v) => setValues((p) => ({ ...p, [f.name]: v }))} />
          </label>
        ))}
        {error && <div className="msg bad">{error}</div>}
        {busy && <div className="msg">{t('working')}</div>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} disabled={busy}>{t('cancel')}</button>
          <button className="primary" disabled={busy}>{submitLabel ?? t('save')}</button>
        </div>
      </form>
    </div>
  );
}
