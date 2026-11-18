<script setup lang="ts">
import type { Captcha } from '@hiaok/api-client';
defineProps<{ captcha: Captcha | null; modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [string]; refresh: [] }>();
const { t } = useApp();
</script>

<template>
  <label v-if="captcha?.required" class="field captcha">
    <span>{{ t('captcha') }}</span>
    <div class="row">
      <input :value="modelValue" autocomplete="off" autocapitalize="characters" required
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
      <img v-if="captcha.image" :src="captcha.image" :alt="t('captcha')" :title="t('refreshCaptcha')" @click="emit('refresh')" />
    </div>
  </label>
</template>
