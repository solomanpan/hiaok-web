<script setup lang="ts">
const { app, session, t } = useApp();
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
    await app.auth.register.execute({
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
  <AuthPage :title="`${t('appName')} · ${t('register')}`" @submit="submit">
    <AuthSettings />
    <PickOrType v-model="org" :title="t('orgUuid')" :options="orgs" />
    <PickOrType v-model="f.tenant" :title="t('tenantUuid')" :options="tenants" />
    <div class="grid gap-1.5"><UiLabel>{{ t('username') }}</UiLabel><UiInput v-model="f.username" autocomplete="username" required /></div>
    <div class="grid gap-1.5"><UiLabel>{{ t('password') }}</UiLabel><UiInput v-model="f.password" type="password" autocomplete="new-password" required minlength="8" /></div>
    <div class="grid gap-1.5"><UiLabel>{{ t('email') }}</UiLabel><UiInput v-model="f.email" type="email" /></div>
    <div class="grid gap-1.5"><UiLabel>{{ t('phone') }}</UiLabel><UiInput v-model="f.phone" inputmode="tel" /></div>
    <div class="grid gap-1.5"><UiLabel>{{ t('nickname') }}</UiLabel><UiInput v-model="f.nickname" /></div>
    <CaptchaField v-model="code" :captcha="captcha" @refresh="refreshCaptcha" />
    <UiAlert v-if="error" variant="destructive">{{ error }}</UiAlert>
    <UiAlert v-if="done" variant="success">{{ t('registered') }}</UiAlert>
    <UiButton type="submit" :disabled="busy" class="w-full">{{ busy ? t('working') : t('register') }}</UiButton>
    <UiButton variant="link" class="h-auto p-0" @click="navigateTo('/login')">{{ t('haveAccount') }}</UiButton>
  </AuthPage>
</template>
