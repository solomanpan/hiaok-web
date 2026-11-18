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

const picked = (name: string) => new Set(Array.isArray(values[name]) ? (values[name] as string[]) : []);
function toggle(name: string, v: string, on: boolean) {
  const next = picked(name);
  if (on) next.add(v); else next.delete(v);
  values[name] = [...next];
}
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
  <UiDialog :title="title" @close="!busy && emit('close')">
    <form class="grid gap-4" @submit.prevent="submit">
      <div v-for="f in fields" :key="f.name" class="grid gap-1.5">
        <UiLabel>{{ l(f.name) }}{{ f.required ? ' *' : '' }}</UiLabel>
        <UiCheckbox v-if="f.type === 'bool'" :model-value="Boolean(values[f.name])" :aria-label="l(f.name)"
          @update:model-value="(v) => { values[f.name] = v === true; }" />
        <UiSelect v-else-if="f.type === 'select'" :model-value="String(values[f.name] ?? '')"
          @update:model-value="(v) => { values[f.name] = v; }">
          <option value="">{{ t('pick') }}</option>
          <option v-for="o in options[f.name] ?? []" :key="o.value" :value="String(o.value)">{{ optLabel(f, o) }}</option>
        </UiSelect>
        <div v-else-if="f.type === 'multi'" class="max-h-44 space-y-1 overflow-auto rounded-md border bg-card p-2">
          <div v-if="(options[f.name] ?? []).length === 0" class="px-1 text-sm text-muted-foreground">{{ t('empty') }}</div>
          <label v-for="o in options[f.name] ?? []" :key="o.value" class="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-accent">
            <UiCheckbox :model-value="picked(f.name).has(String(o.value))" @update:model-value="(v) => toggle(f.name, String(o.value), v === true)" />
            {{ optLabel(f, o) }}
          </label>
        </div>
        <UiInput v-else :model-value="String(values[f.name] ?? '')" :required="f.required" autocomplete="off"
          :type="f.type === 'password' ? 'password' : f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'datetime' ? 'datetime-local' : 'text'"
          @update:model-value="(v) => { values[f.name] = v; }" />
      </div>
      <UiAlert v-if="error" variant="destructive">{{ error }}</UiAlert>
      <UiAlert v-if="busy">{{ t('working') }}</UiAlert>
      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UiButton variant="outline" :disabled="busy" @click="emit('close')">{{ t('cancel') }}</UiButton>
        <UiButton type="submit" :disabled="busy">{{ submitLabel ?? t('save') }}</UiButton>
      </div>
    </form>
  </UiDialog>
</template>
