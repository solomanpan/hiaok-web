<script setup lang="ts">
import {
  changes, createRow, deleteRow, formatCell, initialValues, listRows, loadTree, resourceByName, runAction,
  updateRow, type ActionDef, type Row, type RowPage, type TreeNode, type Values,
} from '@hiaok/shared';

const PAGE = 20;
const route = useRoute();
const { client, session, t, l } = useApp();
const name = computed(() => String(route.params.name));
const res = computed(() => resourceByName(name.value));

const page = ref<RowPage | null>(null);
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

const needsOrg = computed(() => res.value.scoped && !session.value.orgUuid);

async function load() {
  if (needsOrg.value) return;
  loading.value = true; error.value = '';
  try {
    if (asTree.value && res.value.tree) tree.value = await loadTree(client, res.value, session.value);
    else page.value = await listRows(client, res.value, session.value, offset.value, PAGE, applied.value);
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

async function submitCreate(v: Values) { await createRow(client, res.value, session.value, v); await done(); }
async function submitEdit(v: Values) {
  const d = dialog.value;
  if (d?.kind !== 'edit' || !res.value.update) return;
  const diff = changes(res.value.update.fields, editInitial.value, v);
  if (Object.keys(diff).length === 0) return;
  await updateRow(client, res.value, session.value, d.row, diff);
  await done();
}
async function submitAction(v: Values) {
  const d = dialog.value;
  if (d?.kind !== 'action') return;
  const out = await runAction(client, res.value, d.action, session.value, d.row, v);
  if (d.action.showResult) dialog.value = { kind: 'result', title: l(d.action.key), data: out };
  else await done();
}
async function confirmDelete() {
  const d = dialog.value;
  if (d?.kind !== 'delete') return;
  dialog.value = null;
  try { await deleteRow(client, res.value, session.value, d.row); await done(); } catch (e) { error.value = errorText(e); }
}
// a result dialog opened by the action must survive the action form closing
function closeAction() { if (dialog.value?.kind === 'action') dialog.value = null; }
const rowName = (row: Row) => String(row[res.value.nameField] ?? row[res.value.idField] ?? '');
</script>

<template>
  <div>
    <div class="bar">
      <h2>{{ l(res.name) }}</h2>
      <button v-if="res.create" class="primary" @click="dialog = { kind: 'create' }">{{ t('add') }}</button>
      <button @click="load">{{ t('refresh') }}</button>
      <button v-if="res.tree" @click="asTree = !asTree">{{ asTree ? t('listView') : t('treeView') }}</button>
      <span class="grow" />
      <template v-if="!asTree && res.filters">
        <input v-for="f in res.filters" :key="f.name" v-model="filters[f.name]" style="width: 160px" :placeholder="l(f.name)" @keydown.enter="search" />
        <button @click="search">{{ t('search') }}</button>
      </template>
    </div>

    <div v-if="needsOrg" class="msg">{{ t('needOrg') }}</div>
    <div v-if="error" class="msg bad">{{ error }}</div>
    <div v-if="notice" class="msg ok">{{ notice }}</div>
    <div v-if="loading" class="msg">{{ t('loading') }}</div>

    <template v-if="asTree && tree">
      <div v-if="tree.length === 0" class="msg">{{ t('empty') }}</div>
      <div v-else class="card tree" style="max-width: none"><TreeList :nodes="tree" :res="res" @pick="pick" /></div>
    </template>

    <template v-if="!asTree && page">
      <div class="tablewrap">
        <table>
          <thead><tr><th v-for="c in res.columns" :key="c">{{ l(c) }}</th><th>{{ t('actions') }}</th></tr></thead>
          <tbody>
            <tr v-if="rows.length === 0"><td :colspan="res.columns.length + 1">{{ t('empty') }}</td></tr>
            <tr v-for="row in rows" :key="String(row[res.idField])">
              <td v-for="c in res.columns" :key="c" :title="String(row[c] ?? '')">{{ formatCell(session.locale, c, row[c]) }}</td>
              <td class="acts">
                <button @click="dialog = { kind: 'detail', row }">{{ t('details') }}</button>
                <button v-if="res.update" @click="dialog = { kind: 'edit', row }">{{ t('edit') }}</button>
                <button v-for="a in res.actions" :key="a.key" @click="dialog = { kind: 'action', row, action: a }">{{ l(a.key) }}</button>
                <button v-if="res.remove" class="danger" @click="dialog = { kind: 'delete', row }">{{ t('delete') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="pager">
        <span>{{ t('total') }}: {{ total }}</span>
        <button :disabled="offset === 0" @click="offset = Math.max(0, offset - PAGE)">{{ t('prev') }}</button>
        <button :disabled="offset + PAGE >= total" @click="offset += PAGE">{{ t('next') }}</button>
      </div>
    </template>

    <FormDialog v-if="dialog?.kind === 'create' && res.create" :title="`${t('add')} · ${l(res.name)}`" :fields="res.create.fields"
      :initial="initialValues(res.create.fields, session)" :on-submit="submitCreate" @close="dialog = null" />
    <FormDialog v-if="dialog?.kind === 'edit' && res.update" :title="`${t('edit')} · ${rowName(dialog.row)}`" :fields="res.update.fields"
      :initial="editInitial" :on-submit="submitEdit" @close="dialog = null" />
    <FormDialog v-if="dialog?.kind === 'action'" :key="dialog.action.key + rowName(dialog.row)" :title="`${l(dialog.action.key)} · ${rowName(dialog.row)}`"
      :fields="dialog.action.fields" :initial="initialValues(dialog.action.fields, session, dialog.row, dialog.action.prefill)"
      :submit-label="t('confirm')" :on-submit="submitAction" @close="closeAction" />

    <div v-if="dialog?.kind === 'delete'" class="modal" @mousedown.self="dialog = null">
      <div class="card">
        <h1>{{ t('confirmDelete') }}</h1>
        <p>{{ rowName(dialog.row) }}</p>
        <div class="row" style="justify-content: flex-end">
          <button @click="dialog = null">{{ t('cancel') }}</button>
          <button class="danger" @click="confirmDelete">{{ t('delete') }}</button>
        </div>
      </div>
    </div>
    <div v-if="dialog?.kind === 'detail' || dialog?.kind === 'result'" class="modal" @mousedown.self="dialog = null">
      <div class="card">
        <h1>{{ dialog.kind === 'detail' ? rowName(dialog.row) : dialog.title }}</h1>
        <pre>{{ JSON.stringify(dialog.kind === 'detail' ? dialog.row : dialog.data, null, 2) }}</pre>
        <div class="row" style="justify-content: flex-end"><button @click="dialog = null">{{ t('close') }}</button></div>
      </div>
    </div>
  </div>
</template>
