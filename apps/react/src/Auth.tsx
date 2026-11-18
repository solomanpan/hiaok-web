import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Captcha } from '@hiaok/api-client';
import { BACKENDS, LOCALES, listOrganizations, listTenants, type Backend, type Locale, type Option } from '@hiaok/shared';
import { errorText, useApp } from './state';

/** A select that falls back to a free UUID input when the list is empty or not available. */
function PickOrType({ title, options, value, onChange }: { title: string; options: Option[]; value: string; onChange: (v: string) => void }) {
  const { t } = useApp();
  const [manual, setManual] = useState(options.length === 0);
  useEffect(() => { setManual(options.length === 0); }, [options.length]);
  return (
    <label className="field">
      <span>{title}</span>
      {manual ? (
        <div className="row">
          <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="UUID" required />
          {options.length > 0 && <button type="button" onClick={() => setManual(false)}>{t('pick')}</button>}
        </div>
      ) : (
        <div className="row">
          <select value={value} onChange={(e) => onChange(e.target.value)} required>
            <option value="">{t('pick')}</option>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button type="button" onClick={() => setManual(true)}>{t('manual')}</button>
        </div>
      )}
    </label>
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
    <label className="field captcha">
      <span>{t('captcha')}</span>
      <div className="row">
        <input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" autoCapitalize="characters" required />
        {captcha.image && <img src={captcha.image} alt={t('captcha')} title={t('refreshCaptcha')} onClick={refresh} />}
      </div>
    </label>
  );
}

function Settings() {
  const { session, update, t } = useApp();
  return (
    <>
      <div className="row">
        <label className="field"><span>{t('serverUrl')}</span>
          <input value={session.baseUrl} onChange={(e) => update({ baseUrl: e.target.value.trim() })} placeholder="http://localhost:8000" inputMode="url" />
        </label>
        <label className="field" style={{ maxWidth: 110 }}><span>{t('backend')}</span>
          <select value={session.backend} onChange={(e) => update({ backend: e.target.value as Backend })}>
            {BACKENDS.map((b) => <option key={b}>{b}</option>)}
          </select>
        </label>
        <label className="field" style={{ maxWidth: 110 }}><span>{t('language')}</span>
          <select value={session.locale} onChange={(e) => update({ locale: e.target.value as Locale })}>
            {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </label>
      </div>
    </>
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
    <div className="auth">
      <form className="card" onSubmit={submit}>
        <h1>{t('appName')} · {t('signIn')}</h1>
        <Settings />
        <PickOrType title={t('orgUuid')} options={orgs} value={org} onChange={(v) => { setOrg(v); setTenant(''); }} />
        <PickOrType title={t('tenantUuid')} options={tenants} value={tenant} onChange={setTenant} />
        <label className="field"><span>{t('username')}</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required /></label>
        <label className="field"><span>{t('password')}</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
        <CaptchaField captcha={captcha} code={code} setCode={setCode} refresh={refresh} />
        {error && <div className="msg bad">{error}</div>}
        <button className="primary" disabled={busy} style={{ width: '100%' }}>{busy ? t('working') : t('signIn')}</button>
        <div className="row" style={{ marginTop: 10 }}>
          <button type="button" className="link" onClick={() => { location.hash = '#/register'; }}>{t('noAccount')}</button>
          <button type="button" className="link" onClick={enterWithoutAuth}>{t('authOff')}</button>
        </div>
      </form>
    </div>
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

  return (
    <div className="auth">
      <form className="card" onSubmit={submit}>
        <h1>{t('appName')} · {t('register')}</h1>
        <Settings />
        <PickOrType title={t('orgUuid')} options={orgs} value={f.org} onChange={(v) => setF((p) => ({ ...p, org: v, tenant: '' }))} />
        <PickOrType title={t('tenantUuid')} options={tenants} value={f.tenant} onChange={set('tenant')} />
        <label className="field"><span>{t('username')}</span><input value={f.username} onChange={(e) => set('username')(e.target.value)} autoComplete="username" required /></label>
        <label className="field"><span>{t('password')}</span><input type="password" value={f.password} onChange={(e) => set('password')(e.target.value)} autoComplete="new-password" required minLength={8} /></label>
        <label className="field"><span>{t('email')}</span><input type="email" value={f.email} onChange={(e) => set('email')(e.target.value)} /></label>
        <label className="field"><span>{t('phone')}</span><input value={f.phone} onChange={(e) => set('phone')(e.target.value)} inputMode="tel" /></label>
        <label className="field"><span>{t('nickname')}</span><input value={f.nickname} onChange={(e) => set('nickname')(e.target.value)} /></label>
        <CaptchaField captcha={captcha} code={code} setCode={setCode} refresh={refresh} />
        {error && <div className="msg bad">{error}</div>}
        {done && <div className="msg ok">{t('registered')}</div>}
        <button className="primary" disabled={busy} style={{ width: '100%' }}>{busy ? t('working') : t('register')}</button>
        <button type="button" className="link" onClick={() => { location.hash = '#/login'; }}>{t('haveAccount')}</button>
      </form>
    </div>
  );
}
