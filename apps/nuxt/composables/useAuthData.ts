import type { Captcha } from '@hiaok/api-client';
import { listOrganizations, listTenants, type Option } from '@hiaok/shared';

/** Organizations / tenants for the sign-in screens (open list endpoints; empty = manual entry) and the captcha challenge. */
export function useAuthData(org: Ref<string>) {
  const { client, session } = useApp();
  const orgs = ref<Option[]>([]);
  const tenants = ref<Option[]>([]);
  const captcha = ref<Captcha | null>(null);

  const refreshCaptcha = async () => {
    try { captcha.value = await client.auth.captcha(); } catch { captcha.value = null; }
  };
  const loadOrgs = async () => {
    try {
      const p = await listOrganizations(client);
      orgs.value = p.items.map((o) => ({ value: String(o.orgUuid), label: `${o.orgName} (${o.orgCode})` }));
    } catch { orgs.value = []; }
  };
  const reload = () => { void loadOrgs(); void refreshCaptcha(); };

  onMounted(reload);
  watch(() => [session.value.baseUrl, session.value.backend], reload);
  watch(org, async (v) => {
    tenants.value = [];
    if (!v) return;
    try {
      const p = await listTenants(client, v);
      tenants.value = p.items.map((x) => ({ value: String(x.tenantUuid), label: `${x.tenantName} (${x.tenantCode})` }));
    } catch { tenants.value = []; }
  }, { immediate: true });
  return { orgs, tenants, captcha, refreshCaptcha };
}
