<script setup lang="ts">
import { BACKENDS, LOCALES, type Backend, type Locale } from '@hiaok/shared';
const { session, update, t } = useApp();
</script>

<template>
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_6.5rem_6.5rem]">
    <div class="col-span-2 grid gap-1.5 sm:col-span-1">
      <UiLabel>{{ t('serverUrl') }}</UiLabel>
      <UiInput :model-value="session.baseUrl" placeholder="http://localhost:8000" inputmode="url"
        @update:model-value="(v) => update({ baseUrl: String(v).trim() })" />
    </div>
    <div class="grid gap-1.5">
      <UiLabel>{{ t('backend') }}</UiLabel>
      <UiSelect :model-value="session.backend" @update:model-value="(v) => update({ backend: v as Backend })">
        <option v-for="b in BACKENDS" :key="b">{{ b }}</option>
      </UiSelect>
    </div>
    <div class="grid gap-1.5">
      <UiLabel>{{ t('language') }}</UiLabel>
      <UiSelect :model-value="session.locale" @update:model-value="(v) => update({ locale: v as Locale })">
        <option v-for="x in LOCALES" :key="x.code" :value="x.code">{{ x.label }}</option>
      </UiSelect>
    </div>
  </div>
</template>
