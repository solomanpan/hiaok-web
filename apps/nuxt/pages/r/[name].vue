<script setup lang="ts">
import { ChevronLeft, ChevronRight, ListTree, Plus, RefreshCw, Search, Table2 } from 'lucide-vue-next';
import {
  changes, formatCell, initialValues, resourceByName,
  type ActionDef, type Page, type Row, type TreeNode, type Values,
} from '@hiaok/core';

const PAGE = 20;
const route = useRoute();
const { app, session, access, t, l } = useApp();
const name = computed(() => String(route.params.name));
const res = computed(() => resourceByName(name.value));

const page = ref<Page | null>(null);
const tree = ref<TreeNode[] | null>(null);
const offset = ref(0);
const filters = reactive<Values>({});
const applied = ref<Values>({});
const asTree = ref(false);
const loading = ref(false);
const error = ref('');
const notice = ref('');
type Dialog =
  | { kind: 'create' } | { kind: 'edit'; row: Row } | { kind: 'delete'; row: Row } | { kind: 'detail'; row: Row }
  | { kind: 'action'; row: Row; action: ActionDef } | { kind: 'result'; title: string; data: unknown };
const dialog = ref<Dialog | null>(null);

const lookupText = ref('');
async function lookup() {
  const lk = res.value.lookup;
  if (!lk || !lookupText.value.trim()) return;
  error.value = '';
  try {
    const key = lookupText.value.trim();
    const data = lk.use === 'outcome' ? await app.resources.outcome.execute(key) : await app.resources.configByKey.execute(key);
    dialog.value = { kind: 'result', title: `${l(lk.field)}: ${key}`, data };
  } catch (e) { error.value = errorText(e); }
}

// the detail dialog shows the list row at once, then the server's current version (`<resource>/get`)
const fresh = ref<Row | null>(null);
watch(dialog, async (d) => {
  fresh.value = null;
  if (d?.kind !== 'detail') return;
  try { const r = await app.resources.get.execute(res.value, d.row); if (dialog.value === d) fresh.value = r; } catch { /* keep the list row */ }
});

const needsOrg = computed(() => res.value.scoped && !session.value.orgUuid);

async function load() {
  if (needsOrg.value) return;
  loading.value = true; error.value = '';
  try {
    if (asTree.value && res.value.tree) tree.value = await app.resources.tree.execute(res.value);
    else page.value = await app.resources.list.execute(res.value, offset.value, PAGE, applied.value);
  } catch (e) { error.value = errorText(e); }
  finally { loading.value = false; }
}

watch(name, () => {
  offset.value = 0; applied.value = {}; Object.keys(filters).forEach((k) => delete filters[k]);
  page.value = null; tree.value = null; asTree.value = false; notice.value = ''; dialog.value = null;
});
watch([name, offset, applied, asTree, () => session.value.orgUuid, () => session.value.baseUrl], load, { immediate: true });

const done = async () => { notice.value = t('done'); await load(); };
const search = () => { offset.value = 0; applied.value = { ...filters }; };
const rows = computed(() => page.value?.items ?? []);
const total = computed(() => page.value?.total ?? 0);

function pick(row: Row, kind: string) { dialog.value = { kind: kind as 'detail', row }; }

const editInitial = computed(() => {
  const d = dialog.value;
  return d?.kind === 'edit' && res.value.update ? initialValues(res.value.update.fields, session.value, d.row) : {};
});

async function submitCreate(v: Values) { await app.resources.create.execute(res.value, v); await done(); }
async function submitEdit(v: Values) {
  const d = dialog.value;
  if (d?.kind !== 'edit' || !res.value.update) return;
  const diff = changes(res.value.update.fields, editInitial.value, v);
  if (Object.keys(diff).length === 0) return;
  await app.resources.update.execute(res.value, d.row, diff);
  await done();
}
async function submitAction(v: Values) {
  const d = dialog.value;
  if (d?.kind !== 'action') return;
  const out = await app.resources.runAction.execute(res.value, d.action, d.row, v);
  if (d.action.showResult) dialog.value = { kind: 'result', title: l(d.action.key), data: out };
  else await done();
}
async function confirmDelete() {
  const d = dialog.value;
  if (d?.kind !== 'delete') return;
  dialog.value = null;
  try { await app.resources.remove.execute(res.value, d.row); await done(); } catch (e) { error.value = errorText(e); }
}
// a result dialog opened by the action must survive the action form closing
function closeAction() { if (dialog.value?.kind === 'action') dialog.value = null; }
const rowName = (row: Row) => String(row[res.value.nameField] ?? row[res.value.idField] ?? '');
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <h2 class="mr-2 text-2xl font-semibold tracking-tight">{{ l(res.name) }}</h2>
      <UiButton v-if="res.create && access.can(res, 'add')" @click="dialog = { kind: 'create' }"><Plus />{{ t('add') }}</UiButton>
      <UiButton variant="outline" @click="load"><RefreshCw />{{ t('refresh') }}</UiButton>
      <UiButton v-if="res.tree && access.can(res, 'tree')" variant="outline" @click="asTree = !asTree">
        <Table2 v-if="asTree" /><ListTree v-else />{{ asTree ? t('listView') : t('treeView') }}
      </UiButton>
      <span class="flex-1" />
      <template v-if="res.lookup">
        <UiInput v-model="lookupText" class="w-48" :placeholder="l(res.lookup.field)" @keydown.enter="lookup" />
        <UiButton variant="outline" @click="lookup"><Search />{{ t('search') }}</UiButton>
      </template>
      <template v-if="!asTree && res.filters">
        <UiInput v-for="f in res.filters" :key="f.name" class="w-40" :placeholder="l(f.name)" :model-value="String(filters[f.name] ?? '')"
          @update:model-value="(v) => { filters[f.name] = v; }" @keydown.enter="search" />
        <UiButton variant="outline" @click="search"><Search />{{ t('search') }}</UiButton>
      </template>
    </div>

    <UiAlert v-if="needsOrg">{{ t('needOrg') }}</UiAlert>
    <UiAlert v-if="error" variant="destructive">{{ error }}</UiAlert>
    <UiAlert v-if="notice" variant="success">{{ notice }}</UiAlert>
    <UiAlert v-if="loading">{{ t('loading') }}</UiAlert>

    <template v-if="asTree && tree">
      <UiAlert v-if="tree.length === 0">{{ t('empty') }}</UiAlert>
      <UiCard v-else class="p-3"><TreeList :nodes="tree" :res="res" @pick="pick" /></UiCard>
    </template>

    <template v-if="!asTree && page">
      <UiCard class="overflow-hidden">
        <div class="relative w-full overflow-auto">
          <table class="w-full caption-bottom text-sm">
            <thead class="[&_tr]:border-b">
              <tr class="border-b">
                <th v-for="c in res.columns" :key="c" class="h-11 whitespace-nowrap px-3 text-left align-middle text-xs font-medium text-muted-foreground">{{ l(c) }}</th>
                <th class="h-11 px-3 text-left align-middle text-xs font-medium text-muted-foreground">{{ t('actions') }}</th>
              </tr>
            </thead>
            <tbody class="[&_tr:last-child]:border-0">
              <tr v-if="rows.length === 0" class="border-b">
                <td :colspan="res.columns.length + 1" class="py-8 text-center text-muted-foreground">{{ t('empty') }}</td>
              </tr>
              <tr v-for="row in rows" :key="String(row[res.idField])" class="border-b transition-colors hover:bg-muted/50">
                <td v-for="c in res.columns" :key="c" :title="String(row[c] ?? '')" class="max-w-64 truncate whitespace-nowrap px-3 py-2.5 align-middle">
                  <UiBadge v-if="c === 'state' && row[c] !== undefined && row[c] !== null" :variant="Number(row[c]) === 0 ? 'success' : 'destructive'">
                    {{ formatCell(session.locale, c, row[c]) }}
                  </UiBadge>
                  <template v-else>{{ formatCell(session.locale, c, row[c]) }}</template>
                </td>
                <td class="px-3 py-2.5">
                  <div class="flex gap-1.5">
                    <UiButton size="sm" variant="outline" @click="dialog = { kind: 'detail', row }">{{ t('details') }}</UiButton>
                    <UiButton v-if="res.update && access.can(res, 'update')" size="sm" variant="outline" @click="dialog = { kind: 'edit', row }">{{ t('edit') }}</UiButton>
                    <UiButton v-for="a in (res.actions ?? []).filter((x) => access.can(res, x.endpoint))" :key="a.key" size="sm" variant="secondary" @click="dialog = { kind: 'action', row, action: a }">{{ l(a.key) }}</UiButton>
                    <UiButton v-if="res.remove && access.can(res, 'delete')" size="sm" variant="ghost" class="text-destructive hover:text-destructive" @click="dialog = { kind: 'delete', row }">{{ t('delete') }}</UiButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UiCard>
      <div class="flex items-center justify-end gap-2 text-sm text-muted-foreground">
        <span class="mr-2">{{ t('total') }}: {{ total }}</span>
        <UiButton size="sm" variant="outline" :disabled="offset === 0" @click="offset = Math.max(0, offset - PAGE)"><ChevronLeft />{{ t('prev') }}</UiButton>
        <UiButton size="sm" variant="outline" :disabled="offset + PAGE >= total" @click="offset += PAGE">{{ t('next') }}<ChevronRight /></UiButton>
      </div>
    </template>

    <FormDialog v-if="dialog?.kind === 'create' && res.create" :title="`${t('add')} · ${l(res.name)}`" :fields="res.create.fields"
      :initial="initialValues(res.create.fields, session)" :on-submit="submitCreate" @close="dialog = null" />
    <FormDialog v-if="dialog?.kind === 'edit' && res.update" :title="`${t('edit')} · ${rowName(dialog.row)}`" :fields="res.update.fields"
      :initial="editInitial" :on-submit="submitEdit" @close="dialog = null" />
    <FormDialog v-if="dialog?.kind === 'action'" :key="dialog.action.key + rowName(dialog.row)" :title="`${l(dialog.action.key)} · ${rowName(dialog.row)}`"
      :fields="dialog.action.fields" :initial="initialValues(dialog.action.fields, session, dialog.row, dialog.action.prefill)"
      :submit-label="t('confirm')" :on-submit="submitAction" @close="closeAction" />

    <UiDialog v-if="dialog?.kind === 'delete'" :title="t('confirmDelete')" @close="dialog = null">
      <p class="break-all text-sm">{{ rowName(dialog.row) }}</p>
      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UiButton variant="outline" @click="dialog = null">{{ t('cancel') }}</UiButton>
        <UiButton variant="destructive" @click="confirmDelete">{{ t('delete') }}</UiButton>
      </div>
    </UiDialog>
    <UiDialog v-if="dialog?.kind === 'detail' || dialog?.kind === 'result'" :title="dialog.kind === 'detail' ? rowName(dialog.row) : dialog.title" @close="dialog = null">
      <pre class="max-h-[50vh] overflow-auto rounded-md bg-muted p-3 text-xs">{{ JSON.stringify(dialog.kind === 'detail' ? (fresh ?? dialog.row) : dialog.data, null, 2) }}</pre>
      <div class="flex justify-end"><UiButton variant="outline" @click="dialog = null">{{ t('close') }}</UiButton></div>
    </UiDialog>
  </div>
</template>
