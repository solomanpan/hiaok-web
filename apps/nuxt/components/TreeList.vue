<script setup lang="ts">
import { formatCell, type ResourceDef, type Row, type TreeNode } from '@hiaok/shared';
defineProps<{ nodes: TreeNode[]; res: ResourceDef }>();
const emit = defineEmits<{ pick: [Row, string] }>();
const { session, t } = useApp();
</script>

<template>
  <ul>
    <li v-for="n in nodes" :key="String(n.item[res.idField])">
      <div>
        <b>{{ String(n.item[res.nameField] ?? '') }}</b>
        <small>{{ formatCell(session.locale, 'state', n.item.state) }}</small>
        <button @click="emit('pick', n.item, 'detail')">{{ t('details') }}</button>
        <button v-if="res.update" @click="emit('pick', n.item, 'edit')">{{ t('edit') }}</button>
        <button v-if="res.remove" class="danger" @click="emit('pick', n.item, 'delete')">{{ t('delete') }}</button>
      </div>
      <TreeList v-if="n.children.length" :nodes="n.children" :res="res" @pick="(r, k) => emit('pick', r, k)" />
    </li>
  </ul>
</template>
