<script setup lang="ts">
import { Check } from 'lucide-vue-next';
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps<{ class?: string }>();
const model = defineModel<boolean>();
</script>

<template>
  <CheckboxRoot v-model="model" :class="cn('peer size-4 shrink-0 rounded-sm border border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground', props.class)">
    <CheckboxIndicator class="flex items-center justify-center text-current"><Check class="size-3.5" /></CheckboxIndicator>
  </CheckboxRoot>
</template>
