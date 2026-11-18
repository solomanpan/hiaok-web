<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui';

defineProps<{ title: string }>();
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <DialogRoot :open="true" @update:open="(o: boolean) => { if (!o) emit('close'); }">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/50" />
      <DialogContent
        :aria-describedby="undefined"
        class="fixed left-1/2 top-1/2 z-50 grid max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl border bg-card p-6 shadow-lg"
      >
        <DialogTitle class="pr-6 text-lg font-semibold leading-none tracking-tight">{{ title }}</DialogTitle>
        <slot />
        <DialogClose class="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
          <X class="size-4" />
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
