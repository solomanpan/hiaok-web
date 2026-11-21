<script setup lang="ts">
const { app, session, t } = useApp();
const org = ref(session.value.orgUuid);
const tenant = ref(session.value.tenantUuid);
const username = ref('');
const password = ref('');
const code = ref('');
const error = ref('');
const busy = ref(false);
const { orgs, tenants, captcha, refreshCaptcha } = useAuthData(org);
watch(org, () => { tenant.value = ''; });

async function submit() {
  busy.value = true; error.value = '';
  try {
    await app.auth.signIn.execute({
      orgUuid: org.value, tenantUuid: tenant.value, username: username.value, password: password.value,
      ...(captcha.value?.required ? { captchaId: captcha.value.captchaId ?? undefined, captchaCode: code.value } : {}),
    });
    await navigateTo('/');
  } catch (e) {
    error.value = errorText(e); code.value = ''; void refreshCaptcha(); // a captcha is single-use, even after a wrong answer
  } finally { busy.value = false; }
}

// the server runs with AUTH_ENABLED=false: there is nothing to sign in to
async function enterWithoutAuth() {
  error.value = '';
  try {
    await app.auth.enterWithoutAuth.execute({ orgUuid: org.value, tenantUuid: tenant.value });
    await navigateTo('/');
  } catch (e) { error.value = errorText(e); }
}
</script>

<template>
  <AuthPage :title="`${t('appName')} · ${t('signIn')}`" @submit="submit">
    <AuthSettings />
    <PickOrType v-model="org" :title="t('orgUuid')" :options="orgs" />
    <PickOrType v-model="tenant" :title="t('tenantUuid')" :options="tenants" />
    <div class="grid gap-1.5"><UiLabel>{{ t('username') }}</UiLabel><UiInput v-model="username" autocomplete="username" required /></div>
    <div class="grid gap-1.5"><UiLabel>{{ t('password') }}</UiLabel><UiInput v-model="password" type="password" autocomplete="current-password" required /></div>
    <CaptchaField v-model="code" :captcha="captcha" @refresh="refreshCaptcha" />
    <UiAlert v-if="error" variant="destructive">{{ error }}</UiAlert>
    <UiButton type="submit" :disabled="busy" class="w-full">{{ busy ? t('working') : t('signIn') }}</UiButton>
    <div class="flex flex-wrap justify-between gap-2">
      <UiButton variant="link" class="h-auto p-0" @click="navigateTo('/register')">{{ t('noAccount') }}</UiButton>
      <UiButton variant="link" class="h-auto p-0" @click="enterWithoutAuth">{{ t('authOff') }}</UiButton>
    </div>
  </AuthPage>
</template>
