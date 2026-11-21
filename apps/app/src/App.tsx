import '../global.css';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { createHiaokApp, LOCALES, LocalSessionStore, RESOURCES, type App as HiaokApp, type Locale } from '@hiaok/core';
import { Login, Register } from './Auth';
import { ResourcePage } from './ResourcePage';
import { openStorage } from './storage';
import { AppProvider, useApp } from './state';
import { Button, cn, Input, Select } from './ui';

function Menu({ names, current, onPick }: { names: string[]; current: string; onPick: (n: string) => void }) {
  const { session, update, signOut, t, l } = useApp();
  return (
    <View className="flex-1 gap-1 p-3">
      <Text className="px-3 py-2 text-lg font-bold text-foreground">{t('appName')}</Text>
      <ScrollView className="flex-1">
        {names.map((n) => (
          <Pressable key={n} onPress={() => onPick(n)} className={cn('rounded-md px-3 py-2.5', n === current ? 'bg-primary' : 'active:bg-accent')}>
            <Text className={cn('text-sm font-medium', n === current ? 'text-primary-foreground' : 'text-foreground')}>{l(n)}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View className="gap-2 pt-2">
        <Text className="text-xs text-muted-foreground">{t('currentOrg')}</Text>
        <Input value={session.orgUuid} placeholder="UUID" onChangeText={(v) => update({ orgUuid: v.trim() })} />
        <View className="flex-row"><Select value={session.locale} options={LOCALES.map((x) => ({ value: x.code, label: x.label }))}
          onChange={(v) => update({ locale: v as Locale })} placeholder={t('language')} /></View>
        <Button variant="outline" onPress={signOut}>{t('signOut')}</Button>
      </View>
    </View>
  );
}

function Shell() {
  const { access, route, go, t } = useApp();
  const { width } = useWindowDimensions();
  const wide = width >= 768;
  const [open, setOpen] = useState(false);
  const visible = RESOURCES.filter((r) => access.canOpen(r)).map((r) => r.name);
  const name = route.name === 'resource' && route.resource ? route.resource : (visible[0] ?? RESOURCES[0]!.name);
  const known = visible.includes(name);
  const pick = (n: string) => { setOpen(false); go({ name: 'resource', resource: n }); };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 flex-row">
        {wide && <View className="w-60 border-r border-border bg-card"><Menu names={visible} current={name} onPick={pick} /></View>}
        <View className="flex-1">
          {!wide && (
            <View className="flex-row items-center gap-2 border-b border-border bg-card px-3 py-2">
              <Button variant="ghost" tone="neutral" size="sm" onPress={() => setOpen(true)}>☰</Button>
              <Text className="font-bold text-foreground">{t('appName')}</Text>
            </View>
          )}
          <ScrollView contentContainerClassName="p-4" keyboardShouldPersistTaps="handled">
            {known ? <ResourcePage key={name} name={name} /> : <Text className="text-foreground">404</Text>}
          </ScrollView>
        </View>
        {!wide && open && (
          <View className="absolute inset-0 flex-row">
            <SafeAreaView className="w-64 border-r border-border bg-card"><Menu names={visible} current={name} onPick={pick} /></SafeAreaView>
            <Pressable className="flex-1 bg-black/40" onPress={() => setOpen(false)} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function Screens() {
  const { route, session } = useApp();
  const authed = Boolean(session.token) || Boolean(session.userUuid);
  if (route.name === 'register') return <Register />;
  if (route.name === 'login' || !authed) return <Login />;
  return <Shell />;
}

/** Composition root: opens the platform's secure storage, builds the use cases, then renders. */
export default function App({ app: injected }: { app?: HiaokApp }) {
  const [app, setApp] = useState<HiaokApp | null>(injected ?? null);
  useEffect(() => {
    if (injected) return;
    let live = true;
    void openStorage().then((storage) => {
      const language = Intl.DateTimeFormat().resolvedOptions().locale;
      if (live) setApp(createHiaokApp(storage ? { store: new LocalSessionStore(storage, language) } : {}));
    });
    return () => { live = false; };
  }, [injected]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {app ? <AppProvider app={app}><Screens /></AppProvider> : <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator /></View>}
    </SafeAreaProvider>
  );
}
