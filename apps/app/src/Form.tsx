import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { missingRequired, type FieldDef, type Option, type Values } from '@hiaok/core';
import { errorText, useApp } from './state';
import { Alert, Button, Checkbox, Dialog, Field, Input, Select } from './ui';

/** Plain dialog (details, confirmations, results). */
export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const { t } = useApp();
  return (
    <Dialog title={title} onClose={onClose} footer={<>{footer}<Button variant="outline" onPress={onClose}>{t('close')}</Button></>}>
      {children}
    </Dialog>
  );
}

export function Json({ data }: { data: unknown }) {
  return (
    <ScrollView className="max-h-72 rounded-md bg-muted p-3" horizontal>
      <Text selectable className="font-mono text-xs text-foreground">{JSON.stringify(data, null, 2)}</Text>
    </ScrollView>
  );
}

function FieldInput({ f, value, onChange, options }: { f: FieldDef; value: unknown; onChange: (v: unknown) => void; options: Option[] }) {
  const { t, l } = useApp();
  const type = f.type ?? 'text';
  const optLabel = (o: Option) => (f.options ? l(o.label) : o.label);
  if (type === 'bool') return <Checkbox checked={Boolean(value)} onChange={onChange} />;
  if (type === 'select')
    return (
      <View className="flex-row">
        <Select value={String(value ?? '')} placeholder={t('pick')} onChange={onChange}
          options={options.map((o) => ({ value: String(o.value), label: optLabel(o) }))} />
      </View>
    );
  if (type === 'multi') {
    const picked = new Set(Array.isArray(value) ? (value as string[]) : []);
    const toggle = (v: string, on: boolean) => {
      const next = new Set(picked);
      if (on) next.add(v); else next.delete(v);
      onChange([...next]);
    };
    return (
      <View className="rounded-md border border-border bg-card p-2">
        {options.length === 0 && <Text className="px-1 text-sm text-muted-foreground">{t('empty')}</Text>}
        {options.map((o) => (
          <Checkbox key={String(o.value)} label={optLabel(o)} checked={picked.has(String(o.value))} onChange={(c) => toggle(String(o.value), c)} />
        ))}
      </View>
    );
  }
  return (
    <Input
      value={String(value ?? '')} onChangeText={onChange} secureTextEntry={type === 'password'}
      keyboardType={type === 'number' ? 'numeric' : 'default'}
      placeholder={type === 'date' ? 'YYYY-MM-DD' : type === 'datetime' ? 'YYYY-MM-DDTHH:mm' : undefined}
    />
  );
}

/** A form generated from field definitions; `onSubmit` receives the raw values (callers build the request). */
export function FormDialog({ title, fields, initial, onSubmit, onClose, submitLabel }: {
  title: string; fields: FieldDef[]; initial: Values; submitLabel?: string;
  onSubmit: (values: Values) => Promise<unknown>; onClose: () => void;
}) {
  const { app, t, l } = useApp();
  const [values, setValues] = useState<Values>(initial);
  const [options, setOptions] = useState<Record<string, Option[]>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    fields.filter((f) => f.ref || f.options).forEach((f) => {
      app.resources.options.execute(f).then((o) => live && setOptions((p) => ({ ...p, [f.name]: o }))).catch(() => undefined);
    });
    return () => { live = false; };
  }, [app, fields]);

  const submit = async () => {
    const missing = missingRequired(fields, values);
    if (missing) { setError(`${t('fieldRequired')}: ${l(missing)}`); return; }
    setBusy(true); setError('');
    try { await onSubmit(values); onClose(); }
    catch (err) { setError(errorText(err)); }
    finally { setBusy(false); }
  };

  return (
    <Dialog title={title} onClose={() => { if (!busy) onClose(); }} footer={<>
      <Button variant="outline" disabled={busy} onPress={onClose}>{t('cancel')}</Button>
      <Button disabled={busy} onPress={submit}>{submitLabel ?? t('save')}</Button>
    </>}>
      {fields.map((f) => (
        <Field key={f.name} label={`${l(f.name)}${f.required ? ' *' : ''}`}>
          <FieldInput f={f} value={values[f.name]} options={options[f.name] ?? []} onChange={(v) => setValues((p) => ({ ...p, [f.name]: v }))} />
        </Field>
      ))}
      {error ? <Alert variant="destructive">{error}</Alert> : null}
      {busy ? <Alert>{t('working')}</Alert> : null}
    </Dialog>
  );
}
