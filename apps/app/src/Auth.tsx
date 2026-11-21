import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BACKENDS, LOCALES, type Backend, type Captcha, type Choice, type Locale } from '@hiaok/core';
import { errorText, useApp } from './state';
import { Alert, Button, Card, Field, Input, Select } from './ui';

function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="flex-grow items-center justify-center p-4" keyboardShouldPersistTaps="handled">
        <Card className="w-full max-w-md gap-4 p-5">
          <Text className="text-xl font-semibold text-foreground">{title}</Text>
          {children}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

/** A picker that falls back to a free UUID input when the list is empty or not available. */
function PickOrType({ title, options, value, onChange }: { title: string; options: Choice[]; value: string; onChange: (v: string) => void }) {
  const { t } = useApp();
  const [manual, setManual] = useState(options.length === 0);
  useEffect(() => { setManual(options.length === 0); }, [options.length]);
  return (
    <Field label={title}>
      <View className="flex-row gap-2">
        {manual ? (
          <>
            <Input className="flex-1" value={value} onChangeText={onChange} placeholder="UUID" />
            {options.length > 0 && <Button variant="outline" onPress={() => setManual(false)}>{t('pick')}</Button>}
          </>
        ) : (
          <>
            <Select value={value} options={options} onChange={onChange} placeholder={t('pick')} />
            <Button variant="outline" onPress={() => setManual(true)}>{t('manual')}</Button>
          </>
        )}
      </View>
    </Field>
  );
}

export function useCaptcha() {
  const { app } = useApp();
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const refresh = useCallback(async () => { setCaptcha(await app.auth.captcha.execute()); }, [app]);
  return { captcha, refresh };
}

function CaptchaField({ captcha, code, setCode, refresh }: { captcha: Captcha | null; code: string; setCode: (v: string) => void; refresh: () => void }) {
  const { t } = useApp();
  if (!captcha?.required) return null;
  return (
    <Field label={t('captcha')}>
      <View className="flex-row items-center gap-2">
        <Input className="flex-1" value={code} onChangeText={setCode} autoCapitalize="characters" />
        {captcha.image ? (
          <Image accessibilityLabel={t('refreshCaptcha')} source={{ uri: captcha.image }} resizeMode="contain"
            onTouchEnd={refresh} className="h-10 w-28 rounded-md border border-border bg-white" />
        ) : null}
      </View>
      <Button variant="link" size="sm" className="self-start px-0" onPress={refresh}>{t('refreshCaptcha')}</Button>
    </Field>
  );
}

function Settings() {
  const { session, update, t } = useApp();
  return (
    <View className="gap-3">
      <Field label={t('serverUrl')}>
        <Input value={session.baseUrl} onChangeText={(v) => update({ baseUrl: v.trim() })} placeholder="http://localhost:8000" keyboardType="url" />
      </Field>
      <View className="flex-row gap-3">
        <View className="flex-1"><Field label={t('backend')}>
          <View className="flex-row"><Select value={session.backend} options={BACKENDS.map((b) => ({ value: b, label: b }))}
            onChange={(v) => update({ backend: v as Backend })} placeholder={t('backend')} /></View>
        </Field></View>
        <View className="flex-1"><Field label={t('language')}>
          <View className="flex-row"><Select value={session.locale} options={LOCALES.map((x) => ({ value: x.code, label: x.label }))}
            onChange={(v) => update({ locale: v as Locale })} placeholder={t('language')} /></View>
        </Field></View>
      </View>
    </View>
  );
}

/** Organizations / tenants from the list endpoints; empty lists (or a 403 with auth on) mean manual entry. */
function useOrgTenant(org: string) {
  const { app, session } = useApp();
  const [orgs, setOrgs] = useState<Choice[]>([]);
  const [tenants, setTenants] = useState<Choice[]>([]);
  useEffect(() => {
    let live = true;
    void app.auth.choices.organizations().then((c) => live && setOrgs(c));
    return () => { live = false; };
  }, [app, session.baseUrl, session.backend]);
  useEffect(() => {
    let live = true;
    void app.auth.choices.tenants(org).then((c) => live && setTenants(c));
    return () => { live = false; };
  }, [app, org, session.baseUrl]);
  return { orgs, tenants };
}

export function Login() {
  const { app, session, t, go } = useApp();
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

  const submit = async () => {
    setBusy(true); setError('');
    try {
      await app.auth.signIn.execute({
        orgUuid: org, tenantUuid: tenant, username, password,
        ...(captcha?.required ? { captchaId: captcha.captchaId ?? undefined, captchaCode: code } : {}),
      });
      go({ name: 'resource' });
    } catch (err) {
      setError(errorText(err)); setCode(''); void refresh(); // a captcha is single-use, even after a wrong answer
    } finally { setBusy(false); }
  };

  // the server runs with AUTH_ENABLED=false: there is nothing to sign in to
  const enterWithoutAuth = async () => {
    setError('');
    try {
      await app.auth.enterWithoutAuth.execute({ orgUuid: org, tenantUuid: tenant });
      go({ name: 'resource' });
    } catch (err) { setError(errorText(err)); }
  };

  return (
    <Page title={`${t('appName')} · ${t('signIn')}`}>
      <Settings />
      <PickOrType title={t('orgUuid')} options={orgs} value={org} onChange={(v) => { setOrg(v); setTenant(''); }} />
      <PickOrType title={t('tenantUuid')} options={tenants} value={tenant} onChange={setTenant} />
      <Field label={t('username')}><Input value={username} onChangeText={setUsername} autoComplete="username" /></Field>
      <Field label={t('password')}><Input value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" onSubmitEditing={submit} /></Field>
      <CaptchaField captcha={captcha} code={code} setCode={setCode} refresh={refresh} />
      {error ? <Alert variant="destructive">{error}</Alert> : null}
      <Button disabled={busy} onPress={submit}>{busy ? t('working') : t('signIn')}</Button>
      <View className="flex-row flex-wrap justify-between gap-2">
        <Button variant="link" onPress={() => go({ name: 'register' })}>{t('noAccount')}</Button>
        <Button variant="link" onPress={enterWithoutAuth}>{t('authOff')}</Button>
      </View>
    </Page>
  );
}

export function Register() {
  const { app, session, t, go } = useApp();
  const [f, setF] = useState({ org: session.orgUuid, tenant: session.tenantUuid, username: '', password: '', email: '', phone: '', nickname: '' });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const { orgs, tenants } = useOrgTenant(f.org);
  const { captcha, refresh } = useCaptcha();
  useEffect(() => { void refresh(); }, [refresh, session.baseUrl, session.backend]);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setBusy(true); setError(''); setDone(false);
    try {
      await app.auth.register.execute({
        orgUuid: f.org, tenantUuid: f.tenant, username: f.username, password: f.password,
        ...(f.email ? { email: f.email } : {}), ...(f.phone ? { phone: f.phone } : {}), ...(f.nickname ? { nickname: f.nickname } : {}),
        ...(captcha?.required ? { captchaId: captcha.captchaId ?? undefined, captchaCode: code } : {}),
      });
      setDone(true);
    } catch (err) { setError(errorText(err)); }
    finally { setCode(''); void refresh(); setBusy(false); }
  };

  return (
    <Page title={`${t('appName')} · ${t('register')}`}>
      <Settings />
      <PickOrType title={t('orgUuid')} options={orgs} value={f.org} onChange={(v) => setF((p) => ({ ...p, org: v, tenant: '' }))} />
      <PickOrType title={t('tenantUuid')} options={tenants} value={f.tenant} onChange={set('tenant')} />
      <Field label={t('username')}><Input value={f.username} onChangeText={set('username')} autoComplete="username" /></Field>
      <Field label={t('password')}><Input value={f.password} onChangeText={set('password')} secureTextEntry autoComplete="new-password" /></Field>
      <Field label={t('email')}><Input value={f.email} onChangeText={set('email')} keyboardType="email-address" /></Field>
      <Field label={t('phone')}><Input value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" /></Field>
      <Field label={t('nickname')}><Input value={f.nickname} onChangeText={set('nickname')} /></Field>
      <CaptchaField captcha={captcha} code={code} setCode={setCode} refresh={refresh} />
      {error ? <Alert variant="destructive">{error}</Alert> : null}
      {done ? <Alert variant="success">{t('registered')}</Alert> : null}
      <Button disabled={busy} onPress={submit}>{busy ? t('working') : t('register')}</Button>
      <Button variant="link" onPress={() => go({ name: 'login' })}>{t('haveAccount')}</Button>
    </Page>
  );
}
