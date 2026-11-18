<script setup lang="ts">
const { client, session, t } = useApp();
const org = ref(session.value.orgUuid);
const f = reactive({ tenant: session.value.tenantUuid, username: '', password: '', email: '', phone: '', nickname: '' });
const code = ref('');
const error = ref('');
const done = ref(false);
const busy = ref(false);
const { orgs, tenants, captcha, refreshCaptcha } = useAuthData(org);
watch(org, () => { f.tenant = ''; });

async function submit() {
  busy.value = true; error.value = ''; done.value = false;
  try {
    await client.users.register({
      orgUuid: org.value, tenantUuid: f.tenant, username: f.username, password: f.password,
      ...(f.email ? { email: f.email } : {}), ...(f.phone ? { phone: f.phone } : {}), ...(f.nickname ? { nickname: f.nickname } : {}),
      ...(captcha.value?.required ? { captchaId: captcha.value.captchaId ?? undefined, captchaCode: code.value } : {}),
    });
    done.value = true;
  } catch (e) { error.value = errorText(e); }
  finally { code.value = ''; void refreshCaptcha(); busy.value = false; }
}
</script>

<template>
  <div class="auth">
    <form class="card" @submit.prevent="submit">
      <h1>{{ t('appName') }} · {{ t('register') }}</h1>
      <AuthSettings />
      <PickOrType v-model="org" :title="t('orgUuid')" :options="orgs" />
      <PickOrType v-model="f.tenant" :title="t('tenantUuid')" :options="tenants" />
      <label class="field"><span>{{ t('username') }}</span><input v-model="f.username" autocomplete="username" required /></label>
      <label class="field"><span>{{ t('password') }}</span><input v-model="f.password" type="password" autocomplete="new-password" required minlength="8" /></label>
      <label class="field"><span>{{ t('email') }}</span><input v-model="f.email" type="email" /></label>
      <label class="field"><span>{{ t('phone') }}</span><input v-model="f.phone" inputmode="tel" /></label>
      <label class="field"><span>{{ t('nickname') }}</span><input v-model="f.nickname" /></label>
      <CaptchaField v-model="code" :captcha="captcha" @refresh="refreshCaptcha" />
      <div v-if="error" class="msg bad">{{ error }}</div>
      <div v-if="done" class="msg ok">{{ t('registered') }}</div>
      <button class="primary" :disabled="busy" style="width: 100%">{{ busy ? t('working') : t('register') }}</button>
      <button type="button" class="link" @click="navigateTo('/login')">{{ t('haveAccount') }}</button>
    </form>
  </div>
</template>
