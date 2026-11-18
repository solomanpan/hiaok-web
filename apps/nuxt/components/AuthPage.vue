<script setup lang="ts">
defineProps<{ title: string }>();
defineEmits<{ submit: [] }>();
</script>

<template>
  <div class="grid min-h-dvh place-items-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
    <UiCard class="w-full max-w-md">
      <div class="p-6 pb-2"><h1 class="text-xl font-semibold tracking-tight">{{ title }}</h1></div>
      <form class="grid gap-4 p-6 pt-4" @submit.prevent="$emit('submit')"><slot /></form>
    </UiCard>
  </div>
</template>
