<script setup lang="ts">
import { RESOURCES } from '@hiaok/core';
const { access } = useApp();
await navigateTo(`/r/${(RESOURCES.find((r) => access.value.canOpen(r)) ?? RESOURCES[0]!).name}`, { replace: true });
</script>

<template><div /></template>
