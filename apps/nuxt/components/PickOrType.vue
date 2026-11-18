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
  <div class="grid gap-1.5">
    <UiLabel>{{ title }}</UiLabel>
    <div v-if="manual" class="flex gap-2">
      <UiInput v-model="val" placeholder="UUID" required />
      <UiButton v-if="options.length" variant="outline" @click="manual = false">{{ t('pick') }}</UiButton>
    </div>
    <div v-else class="flex gap-2">
      <UiSelect v-model="val" required>
        <option value="">{{ t('pick') }}</option>
        <option v-for="o in options" :key="o.value" :value="String(o.value)">{{ o.label }}</option>
      </UiSelect>
      <UiButton variant="outline" @click="manual = true">{{ t('manual') }}</UiButton>
    </div>
  </div>
</template>
