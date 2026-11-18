import { useEffect, useState } from 'react';
import { LOCALES, RESOURCES, type Locale } from '@hiaok/shared';
import { Login, Register } from './Auth';
import { ResourcePage } from './ResourcePage';
import { AppProvider, useApp, useRoute } from './state';

function Shell({ route }: { route: string }) {
  const { session, update, signOut, t, l } = useApp();
  const [open, setOpen] = useState(false);
  const name = route.startsWith('/r/') ? route.slice(3) : RESOURCES[0]!.name;
  const known = RESOURCES.some((r) => r.name === name);
  useEffect(() => setOpen(false), [route]);
  return (
    <div className="shell">
      <div className="topbar">
        <button onClick={() => setOpen(!open)} aria-label="menu">☰</button>
        <b>{t('appName')}</b>
      </div>
      <nav className={`side${open ? ' open' : ''}`}>
        <b style={{ padding: '8px 12px' }}>{t('appName')}</b>
        {RESOURCES.map((r) => (
          <a key={r.name} href={`#/r/${r.name}`} className={r.name === name ? 'on' : ''}>{l(r.name)}</a>
        ))}
        <span className="grow" />
        <label className="field" style={{ padding: '0 6px' }}>
          <span>{t('currentOrg')}</span>
          <input value={session.orgUuid} placeholder="UUID" onChange={(e) => update({ orgUuid: e.target.value.trim() })} />
        </label>
        <select value={session.locale} onChange={(e) => update({ locale: e.target.value as Locale })}>
          {LOCALES.map((x) => <option key={x.code} value={x.code}>{x.label}</option>)}
        </select>
        <button onClick={signOut}>{t('signOut')}</button>
      </nav>
      <main className="main">{known ? <ResourcePage key={name} name={name} /> : <div className="msg bad">404</div>}</main>
    </div>
  );
}

function Routes() {
  const route = useRoute();
  const { session } = useApp();
  const authed = Boolean(session.token) || Boolean(session.userUuid);
  if (route === '/register') return <Register />;
  if (route === '/login' || !authed) return <Login />;
  return <Shell route={route} />;
}

export default function App() {
  return <AppProvider><Routes /></AppProvider>;
}
