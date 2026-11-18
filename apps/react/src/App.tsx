import { useEffect, useState } from 'react';
import { LOCALES, RESOURCES, type Locale } from '@hiaok/shared';
import { Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
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
    <div className="min-h-dvh md:grid md:grid-cols-[14rem_1fr]">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-card px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] md:hidden">
        <Button variant="ghost" size="icon" aria-label="menu" onClick={() => setOpen(!open)}><Menu /></Button>
        <b>{t('appName')}</b>
      </header>
      {open && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}
      <nav className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-60 -translate-x-full flex-col gap-1 border-r bg-card p-3 pt-[max(0.75rem,env(safe-area-inset-top))] transition-transform md:sticky md:top-0 md:h-dvh md:w-auto md:translate-x-0',
        open && 'translate-x-0',
      )}>
        <b className="px-3 py-2 text-lg">{t('appName')}</b>
        <div className="flex-1 space-y-0.5 overflow-auto">
          {RESOURCES.map((r) => (
            <a key={r.name} href={`#/r/${r.name}`} className={cn(
              'block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent',
              r.name === name && 'bg-primary text-primary-foreground hover:bg-primary/90',
            )}>{l(r.name)}</a>
          ))}
        </div>
        <div className="grid gap-2 pt-2">
          <label className="grid gap-1 text-xs text-muted-foreground">{t('currentOrg')}
            <Input value={session.orgUuid} placeholder="UUID" onChange={(e) => update({ orgUuid: e.target.value.trim() })} />
          </label>
          <Select value={session.locale} onChange={(e) => update({ locale: e.target.value as Locale })}>
            {LOCALES.map((x) => <option key={x.code} value={x.code}>{x.label}</option>)}
          </Select>
          <Button variant="outline" onClick={signOut}><LogOut />{t('signOut')}</Button>
        </div>
      </nav>
      <main className="min-w-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-6">
        {known ? <ResourcePage key={name} name={name} /> : <div>404</div>}
      </main>
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
