<script setup lang="ts">
import { loadOptions, missingRequired, type FieldDef, type Option, type Values } from '@hiaok/shared';

const props = defineProps<{
  title: string; fields: FieldDef[]; initial: Values; submitLabel?: string;
  onSubmit: (values: Values) => Promise<unknown>;
}>();
const emit = defineEmits<{ close: [] }>();
const { client, session, t, l } = useApp();
const values = reactive<Values>({ ...props.initial });
const options = reactive<Record<string, Option[]>>({});
const error = ref('');
const busy = ref(false);

onMounted(() => {
  for (const f of props.fields.filter((x) => x.ref || x.options)) {
    loadOptions(client, f, session.value).then((o) => { options[f.name] = o; }).catch(() => undefined);
  }
});

const optLabel = (f: FieldDef, o: Option) => (f.options ? l(o.label) : o.label);

async function submit() {
  const missing = missingRequired(props.fields, values);
  if (missing) { error.value = `${t('fieldRequired')}: ${l(missing)}`; return; }
  busy.value = true; error.value = '';
  try { await props.onSubmit({ ...values }); emit('close'); }
  catch (e) { error.value = errorText(e); }
  finally { busy.value = false; }
}
</script>

<template>
  <div class="modal" @mousedown.self="!busy && emit('close')">
    <form class="card" @submit.prevent="submit">
      <h1>{{ title }}</h1>
      <label v-for="f in fields" :key="f.name" class="field">
        <span>{{ l(f.name) }}{{ f.required ? ' *' : '' }}</span>
        <input v-if="f.type === 'bool'" v-model="values[f.name]" type="checkbox" style="width: auto" />
        <select v-else-if="f.type === 'select'" v-model="values[f.name]" :required="f.required">
          <option value="">{{ t('pick') }}</option>
          <option v-for="o in options[f.name] ?? []" :key="o.value" :value="String(o.value)">{{ optLabel(f, o) }}</option>
        </select>
        <select v-else-if="f.type === 'multi'" v-model="values[f.name]" multiple :size="Math.min(6, Math.max(3, (options[f.name] ?? []).length))">
          <option v-for="o in options[f.name] ?? []" :key="o.value" :value="String(o.value)">{{ optLabel(f, o) }}</option>
        </select>
        <input v-else v-model="values[f.name]" :required="f.required" autocomplete="off"
          :type="f.type === 'password' ? 'password' : f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'datetime' ? 'datetime-local' : 'text'" />
      </label>
      <div v-if="error" class="msg bad">{{ error }}</div>
      <div v-if="busy" class="msg">{{ t('working') }}</div>
      <div class="row" style="justify-content: flex-end">
        <button type="button" :disabled="busy" @click="emit('close')">{{ t('cancel') }}</button>
        <button class="primary" :disabled="busy">{{ submitLabel ?? t('save') }}</button>
      </div>
    </form>
  </div>
</template>
