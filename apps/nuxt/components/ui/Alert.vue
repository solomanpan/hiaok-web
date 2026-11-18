<script setup lang="ts">
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva('relative w-full rounded-lg border px-4 py-3 text-sm', {
  variants: {
    variant: {
      default: 'bg-muted text-foreground',
      destructive: 'border-destructive/40 bg-destructive/10 text-destructive',
      success: 'border-success/40 bg-success/10 text-success',
    },
  },
  defaultVariants: { variant: 'default' },
});
const props = defineProps<{ variant?: 'default' | 'destructive' | 'success'; class?: string }>();
</script>

<template>
  <div role="alert" :class="cn(alertVariants({ variant }), props.class)"><slot /></div>
</template>
