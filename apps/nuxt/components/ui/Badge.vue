<script setup lang="ts">
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', {
  variants: {
    variant: {
      default: 'border-transparent bg-primary text-primary-foreground',
      secondary: 'border-transparent bg-secondary text-secondary-foreground',
      outline: 'text-foreground',
      success: 'border-transparent bg-success/15 text-success',
      destructive: 'border-transparent bg-destructive/15 text-destructive',
    },
  },
  defaultVariants: { variant: 'default' },
});
const props = defineProps<{ variant?: 'default' | 'secondary' | 'outline' | 'success' | 'destructive'; class?: string }>();
</script>

<template>
  <div :class="cn(badgeVariants({ variant }), props.class)"><slot /></div>
</template>
