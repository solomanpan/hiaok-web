<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next';
import { cn } from '@/lib/utils';

const props = defineProps<{ class?: string }>();
const model = defineModel<string>();
</script>

<template>
  <!-- shadcn "native select": reliable inside iOS / Android web views -->
  <div class="relative w-full">
    <select v-model="model" :class="cn('flex h-10 w-full appearance-none rounded-md border border-input bg-card px-3 py-2 pr-9 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 md:text-sm', props.class)">
      <slot />
    </select>
    <ChevronDown class="pointer-events-none absolute right-3 top-3 size-4 text-muted-foreground" />
  </div>
</template>
