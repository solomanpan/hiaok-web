<script setup lang="ts">
import type { Captcha } from '@hiaok/api-client';
defineProps<{ captcha: Captcha | null; modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [string]; refresh: [] }>();
const { t } = useApp();
</script>

<template>
  <div v-if="captcha?.required" class="grid gap-1.5">
    <UiLabel>{{ t('captcha') }}</UiLabel>
    <div class="flex items-center gap-2">
      <UiInput :model-value="modelValue" autocomplete="off" autocapitalize="characters" required
        @update:model-value="(v) => emit('update:modelValue', String(v))" />
      <img v-if="captcha.image" :src="captcha.image" :alt="t('captcha')" :title="t('refreshCaptcha')"
        class="h-10 shrink-0 cursor-pointer rounded-md border bg-white" @click="emit('refresh')" />
    </div>
  </div>
</template>
