<script setup lang="ts">
const { client, session, update, t } = useApp();
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
    const r = await client.auth.login({
      orgUuid: org.value, tenantUuid: tenant.value, username: username.value, password: password.value,
      ...(captcha.value?.required ? { captchaId: captcha.value.captchaId ?? undefined, captchaCode: code.value } : {}),
    });
    update({ token: r.accessToken, orgUuid: org.value, tenantUuid: tenant.value, userUuid: r.userUuid });
    await navigateTo('/');
  } catch (e) {
    error.value = errorText(e); code.value = ''; void refreshCaptcha(); // a captcha is single-use, even after a wrong answer
  } finally { busy.value = false; }
}

// the server runs with AUTH_ENABLED=false: there is nothing to sign in to
async function enterWithoutAuth() {
  error.value = '';
  try {
    const me = await client.auth.me();
    update({ token: null, orgUuid: org.value || me.orgUuid, tenantUuid: tenant.value || me.tenantUuid, userUuid: me.userUuid });
    await navigateTo('/');
  } catch (e) { error.value = errorText(e); }
}
</script>

<template>
  <div class="auth">
    <form class="card" @submit.prevent="submit">
      <h1>{{ t('appName') }} · {{ t('signIn') }}</h1>
      <AuthSettings />
      <PickOrType v-model="org" :title="t('orgUuid')" :options="orgs" />
      <PickOrType v-model="tenant" :title="t('tenantUuid')" :options="tenants" />
      <label class="field"><span>{{ t('username') }}</span><input v-model="username" autocomplete="username" required /></label>
      <label class="field"><span>{{ t('password') }}</span><input v-model="password" type="password" autocomplete="current-password" required /></label>
      <CaptchaField v-model="code" :captcha="captcha" @refresh="refreshCaptcha" />
      <div v-if="error" class="msg bad">{{ error }}</div>
      <button class="primary" :disabled="busy" style="width: 100%">{{ busy ? t('working') : t('signIn') }}</button>
      <div class="row" style="margin-top: 10px">
        <button type="button" class="link" @click="navigateTo('/register')">{{ t('noAccount') }}</button>
        <button type="button" class="link" @click="enterWithoutAuth">{{ t('authOff') }}</button>
      </div>
    </form>
  </div>
</template>
