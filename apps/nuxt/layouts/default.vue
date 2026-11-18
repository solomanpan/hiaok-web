<script setup lang="ts">
import { LOCALES, RESOURCES, type Locale } from '@hiaok/shared';
const { session, update, signOut, t, l } = useApp();
const route = useRoute();
const open = ref(false);
watch(() => route.fullPath, () => { open.value = false; });
const isAuth = computed(() => route.path === '/login' || route.path === '/register');
</script>

<template>
  <slot v-if="isAuth" />
  <div v-else class="shell">
    <div class="topbar">
      <button aria-label="menu" @click="open = !open">☰</button>
      <b>{{ t('appName') }}</b>
    </div>
    <nav :class="['side', { open }]">
      <b style="padding: 8px 12px">{{ t('appName') }}</b>
      <NuxtLink v-for="r in RESOURCES" :key="r.name" :to="`/r/${r.name}`" active-class="on">{{ l(r.name) }}</NuxtLink>
      <span class="grow" />
      <label class="field" style="padding: 0 6px">
        <span>{{ t('currentOrg') }}</span>
        <input :value="session.orgUuid" placeholder="UUID" @input="update({ orgUuid: ($event.target as HTMLInputElement).value.trim() })" />
      </label>
      <select :value="session.locale" @change="update({ locale: ($event.target as HTMLSelectElement).value as Locale })">
        <option v-for="x in LOCALES" :key="x.code" :value="x.code">{{ x.label }}</option>
      </select>
      <button @click="signOut">{{ t('signOut') }}</button>
    </nav>
    <main class="main"><slot /></main>
  </div>
</template>
