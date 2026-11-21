<script setup lang="ts">
import { formatCell, type ResourceDef, type Row, type TreeNode } from '@hiaok/core';
defineProps<{ nodes: TreeNode[]; res: ResourceDef }>();
const emit = defineEmits<{ pick: [Row, string] }>();
const { session, access, t } = useApp();
</script>

<template>
  <ul class="space-y-0.5 pl-5 first:pl-0">
    <li v-for="n in nodes" :key="String(n.item[res.idField])">
      <div class="flex flex-wrap items-center gap-2 rounded-md px-2 py-1 hover:bg-accent">
        <b>{{ String(n.item[res.nameField] ?? '') }}</b>
        <UiBadge v-if="n.item.state !== undefined && n.item.state !== null" :variant="Number(n.item.state) === 0 ? 'success' : 'destructive'">
          {{ formatCell(session.locale, 'state', n.item.state) }}
        </UiBadge>
        <span class="ml-auto flex gap-1.5">
          <UiButton size="sm" variant="outline" @click="emit('pick', n.item, 'detail')">{{ t('details') }}</UiButton>
          <UiButton v-if="res.update && access.can(res, 'update')" size="sm" variant="outline" @click="emit('pick', n.item, 'edit')">{{ t('edit') }}</UiButton>
          <UiButton v-if="res.remove && access.can(res, 'delete')" size="sm" variant="ghost" class="text-destructive hover:text-destructive" @click="emit('pick', n.item, 'delete')">{{ t('delete') }}</UiButton>
        </span>
      </div>
      <TreeList v-if="n.children.length" :nodes="n.children" :res="res" @pick="(r, k) => emit('pick', r, k)" />
    </li>
  </ul>
</template>
