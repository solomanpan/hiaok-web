import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { loadOptions, missingRequired, type FieldDef, type Option, type Values } from '@hiaok/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { errorText, useApp } from './state';

/** Plain dialog (details, confirmations, results). */
export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const { t } = useApp();
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        {children}
        <DialogFooter>{footer}<Button variant="outline" onClick={onClose}>{t('close')}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldInput({ f, value, onChange, options }: { f: FieldDef; value: unknown; onChange: (v: unknown) => void; options: Option[] }) {
  const { t, l } = useApp();
  const type = f.type ?? 'text';
  const optLabel = (o: Option) => (f.options ? l(o.label) : o.label);
  if (type === 'bool') return <Checkbox checked={Boolean(value)} onCheckedChange={(c) => onChange(c === true)} aria-label={l(f.name)} />;
  if (type === 'select')
    return (
      <Select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} required={f.required}>
        <option value="">{t('pick')}</option>
        {options.map((o) => <option key={o.value} value={String(o.value)}>{optLabel(o)}</option>)}
      </Select>
    );
  if (type === 'multi') {
    const picked = new Set(Array.isArray(value) ? (value as string[]) : []);
    const toggle = (v: string, on: boolean) => {
      const next = new Set(picked);
      if (on) next.add(v); else next.delete(v);
      onChange([...next]);
    };
    return (
      <div className="max-h-44 space-y-1 overflow-auto rounded-md border bg-card p-2">
        {options.length === 0 && <div className="px-1 text-sm text-muted-foreground">{t('empty')}</div>}
        {options.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-accent">
            <Checkbox checked={picked.has(String(o.value))} onCheckedChange={(c) => toggle(String(o.value), c === true)} />
            {optLabel(o)}
          </label>
        ))}
      </div>
    );
  }
  const html = type === 'password' ? 'password' : type === 'number' ? 'number' : type === 'date' ? 'date' : type === 'datetime' ? 'datetime-local' : 'text';
  return <Input type={html} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} required={f.required}
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
    <Dialog open onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          {fields.map((f) => (
            <div className="grid gap-1.5" key={f.name}>
              <Label>{l(f.name)}{f.required ? ' *' : ''}</Label>
              <FieldInput f={f} value={values[f.name]} options={options[f.name] ?? []}
                onChange={(v) => setValues((p) => ({ ...p, [f.name]: v }))} />
            </div>
          ))}
          {error && <Alert variant="destructive">{error}</Alert>}
          {busy && <Alert>{t('working')}</Alert>}
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={busy}>{t('cancel')}</Button>
            <Button type="submit" disabled={busy}>{submitLabel ?? t('save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
