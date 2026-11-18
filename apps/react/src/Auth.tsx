import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Captcha } from '@hiaok/api-client';
import { BACKENDS, LOCALES, listOrganizations, listTenants, type Backend, type Locale, type Option } from '@hiaok/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { errorText, useApp } from './state';

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid gap-1.5"><Label>{label}</Label>{children}</div>
);
const Page = ({ title, onSubmit, children }: { title: string; onSubmit: (e: FormEvent) => void; children: React.ReactNode }) => (
  <div className="grid min-h-dvh place-items-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
    <Card className="w-full max-w-md">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent><form className="grid gap-4" onSubmit={onSubmit}>{children}</form></CardContent>
    </Card>
  </div>
);

/** A select that falls back to a free UUID input when the list is empty or not available. */
function PickOrType({ title, options, value, onChange }: { title: string; options: Option[]; value: string; onChange: (v: string) => void }) {
  const { t } = useApp();
  const [manual, setManual] = useState(options.length === 0);
  useEffect(() => { setManual(options.length === 0); }, [options.length]);
  return (
    <Field label={title}>
      {manual ? (
        <div className="flex gap-2">
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="UUID" required />
          {options.length > 0 && <Button variant="outline" onClick={() => setManual(false)}>{t('pick')}</Button>}
        </div>
      ) : (
        <div className="flex gap-2">
          <Select value={value} onChange={(e) => onChange(e.target.value)} required>
            <option value="">{t('pick')}</option>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Button variant="outline" onClick={() => setManual(true)}>{t('manual')}</Button>
        </div>
      )}
    </Field>
  );
}

export function useCaptcha() {
  const { client } = useApp();
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const refresh = useCallback(async () => {
    try { setCaptcha(await client.auth.captcha()); } catch { setCaptcha(null); }
  }, [client]);
  return { captcha, refresh };
}

function CaptchaField({ captcha, code, setCode, refresh }: { captcha: Captcha | null; code: string; setCode: (v: string) => void; refresh: () => void }) {
  const { t } = useApp();
  if (!captcha?.required) return null;
  return (
    <Field label={t('captcha')}>
      <div className="flex items-center gap-2">
        <Input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" autoCapitalize="characters" required />
        {captcha.image && (
          <img src={captcha.image} alt={t('captcha')} title={t('refreshCaptcha')} onClick={refresh}
            className="h-10 shrink-0 cursor-pointer rounded-md border bg-white" />
        )}
      </div>
    </Field>
  );
}

function Settings() {
  const { session, update, t } = useApp();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_6.5rem_6.5rem]">
      <div className="col-span-2 sm:col-span-1"><Field label={t('serverUrl')}>
        <Input value={session.baseUrl} onChange={(e) => update({ baseUrl: e.target.value.trim() })} placeholder="http://localhost:8000" inputMode="url" />
      </Field></div>
      <Field label={t('backend')}>
        <Select value={session.backend} onChange={(e) => update({ backend: e.target.value as Backend })}>
          {BACKENDS.map((b) => <option key={b}>{b}</option>)}
        </Select>
      </Field>
      <Field label={t('language')}>
        <Select value={session.locale} onChange={(e) => update({ locale: e.target.value as Locale })}>
          {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </Select>
      </Field>
    </div>
  );
}

/** Organizations / tenants from the open list endpoints; empty lists mean manual entry. */
function useOrgTenant(org: string) {
  const { client, session } = useApp();
  const [orgs, setOrgs] = useState<Option[]>([]);
  const [tenants, setTenants] = useState<Option[]>([]);
  useEffect(() => {
    let live = true;
    listOrganizations(client)
      .then((p) => live && setOrgs(p.items.map((o) => ({ value: String(o.orgUuid), label: `${o.orgName} (${o.orgCode})` }))))
      .catch(() => live && setOrgs([]));
    return () => { live = false; };
  }, [client, session.baseUrl, session.backend]);
  useEffect(() => {
    let live = true;
    if (!org) { setTenants([]); return; }
    listTenants(client, org)
      .then((p) => live && setTenants(p.items.map((x) => ({ value: String(x.tenantUuid), label: `${x.tenantName} (${x.tenantCode})` }))))
      .catch(() => live && setTenants([]));
    return () => { live = false; };
  }, [client, org, session.baseUrl]);
  return { orgs, tenants };
}

export function Login() {
  const { client, session, update, t } = useApp();
  const [org, setOrg] = useState(session.orgUuid);
  const [tenant, setTenant] = useState(session.tenantUuid);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { orgs, tenants } = useOrgTenant(org);
  const { captcha, refresh } = useCaptcha();
  useEffect(() => { void refresh(); }, [refresh, session.baseUrl, session.backend]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await client.auth.login({
        orgUuid: org, tenantUuid: tenant, username, password,
        ...(captcha?.required ? { captchaId: captcha.captchaId ?? undefined, captchaCode: code } : {}),
      });
      update({ token: r.accessToken, orgUuid: org, tenantUuid: tenant, userUuid: r.userUuid });
      location.hash = '#/';
    } catch (err) {
      setError(errorText(err)); setCode(''); void refresh(); // a captcha is single-use, even after a wrong answer
    } finally { setBusy(false); }
  };

  // the server runs with AUTH_ENABLED=false: there is nothing to sign in to
  const enterWithoutAuth = async () => {
    setError('');
    try {
      const me = await client.auth.me();
      update({ token: null, orgUuid: org || me.orgUuid, tenantUuid: tenant || me.tenantUuid, userUuid: me.userUuid });
      location.hash = '#/';
    } catch (err) { setError(errorText(err)); }
  };

  return (
    <Page title={`${t('appName')} · ${t('signIn')}`} onSubmit={submit}>
      <Settings />
      <PickOrType title={t('orgUuid')} options={orgs} value={org} onChange={(v) => { setOrg(v); setTenant(''); }} />
      <PickOrType title={t('tenantUuid')} options={tenants} value={tenant} onChange={setTenant} />
      <Field label={t('username')}><Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required /></Field>
      <Field label={t('password')}><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></Field>
      <CaptchaField captcha={captcha} code={code} setCode={setCode} refresh={refresh} />
      {error && <Alert variant="destructive">{error}</Alert>}
      <Button type="submit" disabled={busy} className="w-full">{busy ? t('working') : t('signIn')}</Button>
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="link" className="h-auto p-0" onClick={() => { location.hash = '#/register'; }}>{t('noAccount')}</Button>
        <Button variant="link" className="h-auto p-0" onClick={enterWithoutAuth}>{t('authOff')}</Button>
      </div>
    </Page>
  );
}

export function Register() {
  const { client, session, t } = useApp();
  const [f, setF] = useState({ org: session.orgUuid, tenant: session.tenantUuid, username: '', password: '', email: '', phone: '', nickname: '' });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const { orgs, tenants } = useOrgTenant(f.org);
  const { captcha, refresh } = useCaptcha();
  useEffect(() => { void refresh(); }, [refresh, session.baseUrl, session.backend]);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(''); setDone(false);
    try {
      await client.users.register({
        orgUuid: f.org, tenantUuid: f.tenant, username: f.username, password: f.password,
        ...(f.email ? { email: f.email } : {}), ...(f.phone ? { phone: f.phone } : {}), ...(f.nickname ? { nickname: f.nickname } : {}),
        ...(captcha?.required ? { captchaId: captcha.captchaId ?? undefined, captchaCode: code } : {}),
      });
      setDone(true);
    } catch (err) { setError(errorText(err)); }
    finally { setCode(''); void refresh(); setBusy(false); }
  };

  const text = (k: keyof typeof f, label: string, extra: React.ComponentProps<typeof Input> = {}) => (
    <Field label={label}><Input value={f[k]} onChange={(e) => set(k)(e.target.value)} {...extra} /></Field>
  );
  return (
    <Page title={`${t('appName')} · ${t('register')}`} onSubmit={submit}>
      <Settings />
      <PickOrType title={t('orgUuid')} options={orgs} value={f.org} onChange={(v) => setF((p) => ({ ...p, org: v, tenant: '' }))} />
      <PickOrType title={t('tenantUuid')} options={tenants} value={f.tenant} onChange={set('tenant')} />
      {text('username', t('username'), { autoComplete: 'username', required: true })}
      {text('password', t('password'), { type: 'password', autoComplete: 'new-password', required: true, minLength: 8 })}
      {text('email', t('email'), { type: 'email' })}
      {text('phone', t('phone'), { inputMode: 'tel' })}
      {text('nickname', t('nickname'))}
      <CaptchaField captcha={captcha} code={code} setCode={setCode} refresh={refresh} />
      {error && <Alert variant="destructive">{error}</Alert>}
      {done && <Alert variant="success">{t('registered')}</Alert>}
      <Button type="submit" disabled={busy} className="w-full">{busy ? t('working') : t('register')}</Button>
      <Button variant="link" className="h-auto p-0" onClick={() => { location.hash = '#/login'; }}>{t('haveAccount')}</Button>
    </Page>
  );
}
