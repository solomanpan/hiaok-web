<script setup lang="ts">
import type { Option } from '@hiaok/shared';
const props = defineProps<{ title: string; options: Option[]; modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [string] }>();
const { t } = useApp();
const manual = ref(props.options.length === 0);
watch(() => props.options.length, (n) => { manual.value = n === 0; });
const val = computed({ get: () => props.modelValue, set: (v: string) => emit('update:modelValue', v) });
</script>

<template>
  <label class="field">
    <span>{{ title }}</span>
    <div v-if="manual" class="row">
      <input v-model="val" placeholder="UUID" required />
      <button v-if="options.length" type="button" @click="manual = false">{{ t('pick') }}</button>
    </div>
    <div v-else class="row">
      <select v-model="val" required>
        <option value="">{{ t('pick') }}</option>
        <option v-for="o in options" :key="o.value" :value="String(o.value)">{{ o.label }}</option>
      </select>
      <button type="button" @click="manual = true">{{ t('manual') }}</button>
    </div>
  </label>
</template>
