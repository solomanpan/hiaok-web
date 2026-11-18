<script setup lang="ts">
import { BACKENDS, LOCALES, type Backend, type Locale } from '@hiaok/shared';
const { session, update, t } = useApp();
</script>

<template>
  <div class="row">
    <label class="field"><span>{{ t('serverUrl') }}</span>
      <input :value="session.baseUrl" placeholder="http://localhost:8000" inputmode="url"
        @input="update({ baseUrl: ($event.target as HTMLInputElement).value.trim() })" />
    </label>
    <label class="field" style="max-width: 110px"><span>{{ t('backend') }}</span>
      <select :value="session.backend" @change="update({ backend: ($event.target as HTMLSelectElement).value as Backend })">
        <option v-for="b in BACKENDS" :key="b">{{ b }}</option>
      </select>
    </label>
    <label class="field" style="max-width: 110px"><span>{{ t('language') }}</span>
      <select :value="session.locale" @change="update({ locale: ($event.target as HTMLSelectElement).value as Locale })">
        <option v-for="x in LOCALES" :key="x.code" :value="x.code">{{ x.label }}</option>
      </select>
    </label>
  </div>
</template>
