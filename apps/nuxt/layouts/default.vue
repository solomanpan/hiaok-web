<script setup lang="ts">
import { LogOut, Menu } from 'lucide-vue-next';
import { LOCALES, RESOURCES, type Locale } from '@hiaok/core';
import { cn } from '@/lib/utils';
const { session, access, update, signOut, t, l } = useApp();
const visible = computed(() => RESOURCES.filter((r) => access.value.canOpen(r)));
const route = useRoute();
const open = ref(false);
watch(() => route.fullPath, () => { open.value = false; });
const isAuth = computed(() => route.path === '/login' || route.path === '/register');
</script>

<template>
  <slot v-if="isAuth" />
  <div v-else class="min-h-dvh md:grid md:grid-cols-[14rem_1fr]">
    <header class="sticky top-0 z-30 flex items-center gap-2 border-b bg-card px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] md:hidden">
      <UiButton variant="ghost" size="icon" aria-label="menu" @click="open = !open"><Menu /></UiButton>
      <b>{{ t('appName') }}</b>
    </header>
    <div v-if="open" class="fixed inset-0 z-30 bg-black/40 md:hidden" @click="open = false" />
    <nav :class="cn('fixed inset-y-0 left-0 z-40 flex w-60 -translate-x-full flex-col gap-1 border-r bg-card p-3 pt-[max(0.75rem,env(safe-area-inset-top))] transition-transform md:sticky md:top-0 md:h-dvh md:w-auto md:translate-x-0', open && 'translate-x-0')">
      <b class="px-3 py-2 text-lg">{{ t('appName') }}</b>
      <div class="flex-1 space-y-0.5 overflow-auto">
        <NuxtLink v-for="r in visible" :key="r.name" :to="`/r/${r.name}`"
          class="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
          active-class="!bg-primary !text-primary-foreground">{{ l(r.name) }}</NuxtLink>
      </div>
      <div class="grid gap-2 pt-2">
        <label class="grid gap-1 text-xs text-muted-foreground">{{ t('currentOrg') }}
          <UiInput :model-value="session.orgUuid" placeholder="UUID" @update:model-value="(v) => update({ orgUuid: String(v).trim() })" />
        </label>
        <UiSelect :model-value="session.locale" @update:model-value="(v) => update({ locale: v as Locale })">
          <option v-for="x in LOCALES" :key="x.code" :value="x.code">{{ x.label }}</option>
        </UiSelect>
        <UiButton variant="outline" @click="signOut"><LogOut />{{ t('signOut') }}</UiButton>
      </div>
    </nav>
    <main class="min-w-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-6"><slot /></main>
  </div>
</template>
