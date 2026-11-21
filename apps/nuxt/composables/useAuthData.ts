import type { Captcha, Choice } from '@hiaok/core';

/** Organizations / tenants for the sign-in screens (empty = type the UUID) and the captcha challenge. */
export function useAuthData(org: Ref<string>) {
  const { app, session } = useApp();
  const orgs = ref<Choice[]>([]);
  const tenants = ref<Choice[]>([]);
  const captcha = ref<Captcha | null>(null);

  const refreshCaptcha = async () => { captcha.value = await app.auth.captcha.execute(); };
  const reload = async () => {
    orgs.value = await app.auth.choices.organizations();
    await refreshCaptcha();
  };

  onMounted(reload);
  watch(() => [session.value.baseUrl, session.value.backend], reload);
  watch(org, async (v) => { tenants.value = await app.auth.choices.tenants(v); }, { immediate: true });
  return { orgs, tenants, captcha, refreshCaptcha };
}
