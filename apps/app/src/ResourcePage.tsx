import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import {
  changes, formatCell, initialValues, resourceByName, type ActionDef, type Page, type ResourceDef, type Row, type TreeNode, type Values,
} from '@hiaok/core';
import { FormDialog, Json, Modal } from './Form';
import { errorText, useApp } from './state';
import { Alert, Badge, Button, Card, Input } from './ui';

const PAGE = 20;

function StateBadge({ value }: { value: unknown }) {
  const { locale } = useApp();
  if (value === null || value === undefined) return null;
  return <Badge variant={Number(value) === 0 ? 'success' : 'destructive'}>{formatCell(locale, 'state', value)}</Badge>;
}

function TreeView({ nodes, res, render }: { nodes: TreeNode[]; res: ResourceDef; render: (row: Row) => React.ReactNode }) {
  return (
    <View className="gap-1 pl-4">
      {nodes.map((n) => (
        <View key={String(n.item[res.idField])}>
          <View className="gap-1.5 rounded-md px-2 py-1.5">
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className="font-semibold text-foreground">{String(n.item[res.nameField] ?? '')}</Text>
              <StateBadge value={n.item.state} />
            </View>
            <View className="flex-row flex-wrap gap-1.5">{render(n.item)}</View>
          </View>
          {n.children.length > 0 && <TreeView nodes={n.children} res={res} render={render} />}
        </View>
      ))}
    </View>
  );
}

/** Shows the row from the list at once, then replaces it with the server's current version (`<resource>/get`). */
function DetailModal({ res, row, onClose }: { res: ResourceDef; row: Row; onClose: () => void }) {
  const { app } = useApp();
  const [fresh, setFresh] = useState<Row>(row);
  useEffect(() => {
    let live = true;
    app.resources.get.execute(res, row).then((r) => live && setFresh(r)).catch(() => undefined);
    return () => { live = false; };
  }, [app, res, row]);
  return <Modal title={String(fresh[res.nameField] ?? '')} onClose={onClose}><Json data={fresh} /></Modal>;
}

export function ResourcePage({ name }: { name: string }) {
  const { app, session, access, t, l, locale } = useApp();
  const res = useMemo(() => resourceByName(name), [name]);
  const [page, setPage] = useState<Page | null>(null);
  const [tree, setTree] = useState<TreeNode[] | null>(null);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState<Values>({});
  const [applied, setApplied] = useState<Values>({});
  const [asTree, setAsTree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState<
    | { kind: 'create' } | { kind: 'edit'; row: Row } | { kind: 'delete'; row: Row } | { kind: 'detail'; row: Row }
    | { kind: 'action'; row: Row; action: ActionDef } | { kind: 'result'; title: string; data: unknown } | null
  >(null);

  const [lookupText, setLookupText] = useState('');
  const needsOrg = res.scoped && !session.orgUuid;

  const lookup = async () => {
    if (!res.lookup || !lookupText.trim()) return;
    setError('');
    try {
      const data = res.lookup.use === 'outcome' ? await app.resources.outcome.execute(lookupText.trim()) : await app.resources.configByKey.execute(lookupText.trim());
      setDialog({ kind: 'result', title: `${l(res.lookup.field)}: ${lookupText.trim()}`, data });
    } catch (e) { setError(errorText(e)); }
  };

  const load = useCallback(async () => {
    if (needsOrg) return;
    setLoading(true); setError('');
    try {
      if (asTree && res.tree) setTree(await app.resources.tree.execute(res));
      else setPage(await app.resources.list.execute(res, offset, PAGE, applied));
    } catch (e) { setError(errorText(e)); }
    finally { setLoading(false); }
  }, [app, res, session.orgUuid, session.baseUrl, offset, applied, asTree, needsOrg]);

  useEffect(() => { setOffset(0); setApplied({}); setFilters({}); setPage(null); setTree(null); setAsTree(false); setNotice(''); }, [name]);
  useEffect(() => { void load(); }, [load]);

  const done = async () => { setNotice(t('done')); await load(); };

  const rows = page?.items ?? [];
  const total = page?.total ?? 0;
  const rowButtons = (row: Row) => (
    <>
      <Button size="sm" variant="outline" onPress={() => setDialog({ kind: 'detail', row })}>{t('details')}</Button>
      {res.update && access.can(res, 'update') && <Button size="sm" variant="outline" onPress={() => setDialog({ kind: 'edit', row })}>{t('edit')}</Button>}
      {res.actions?.filter((a) => access.can(res, a.endpoint)).map((a) => (
        <Button size="sm" variant="secondary" key={a.key} onPress={() => setDialog({ kind: 'action', row, action: a })}>{l(a.key)}</Button>
      ))}
      {res.remove && access.can(res, 'delete') && <Button size="sm" variant="ghost" onPress={() => setDialog({ kind: 'delete', row })}>{t('delete')}</Button>}
    </>
  );

  return (
    <View className="gap-4">
      <Text className="text-2xl font-semibold text-foreground">{l(res.name)}</Text>
      <View className="flex-row flex-wrap items-center gap-2">
        {res.create && access.can(res, 'add') && <Button onPress={() => setDialog({ kind: 'create' })}>{`+ ${t('add')}`}</Button>}
        <Button variant="outline" onPress={() => void load()}>{t('refresh')}</Button>
        {res.tree && access.can(res, 'tree') && <Button variant="outline" onPress={() => setAsTree(!asTree)}>{asTree ? t('listView') : t('treeView')}</Button>}
      </View>
      {res.lookup && (
        <View className="flex-row gap-2">
          <Input className="flex-1" placeholder={l(res.lookup.field)} value={lookupText} onChangeText={setLookupText} onSubmitEditing={() => void lookup()} />
          <Button variant="outline" onPress={() => void lookup()}>{t('search')}</Button>
        </View>
      )}
      {!asTree && res.filters && (
        <View className="flex-row flex-wrap gap-2">
          {res.filters.map((f) => (
            <Input key={f.name} className="min-w-40 flex-1" placeholder={l(f.name)} value={String(filters[f.name] ?? '')}
              onChangeText={(v) => setFilters({ ...filters, [f.name]: v })} onSubmitEditing={() => { setOffset(0); setApplied(filters); }} />
          ))}
          <Button variant="outline" onPress={() => { setOffset(0); setApplied(filters); }}>{t('search')}</Button>
        </View>
      )}

      {needsOrg ? <Alert>{t('needOrg')}</Alert> : null}
      {error ? <Alert variant="destructive">{error}</Alert> : null}
      {notice ? <Alert variant="success">{notice}</Alert> : null}
      {loading ? <Alert>{t('loading')}</Alert> : null}

      {asTree && tree && (tree.length === 0 ? <Alert>{t('empty')}</Alert> : <Card className="p-2"><TreeView nodes={tree} res={res} render={rowButtons} /></Card>)}

      {!asTree && page && (
        <>
          {rows.length === 0 && <Alert>{t('empty')}</Alert>}
          {/* one card per row: a wide table does not fit a phone */}
          {rows.map((row) => (
            <Card key={String(row[res.idField])} className="gap-2">
              {res.columns.map((c) => (
                <View key={c} className="flex-row items-start justify-between gap-3">
                  <Text className="w-28 text-xs text-muted-foreground">{l(c)}</Text>
                  <View className="flex-1 items-end">
                    {c === 'state' ? <StateBadge value={row[c]} /> : <Text className="text-right text-sm text-foreground">{formatCell(locale, c, row[c])}</Text>}
                  </View>
                </View>
              ))}
              <View className="flex-row flex-wrap gap-1.5 border-t border-border pt-2">{rowButtons(row)}</View>
            </Card>
          ))}
          <View className="flex-row items-center justify-end gap-2">
            <Text className="mr-2 text-sm text-muted-foreground">{`${t('total')}: ${total}`}</Text>
            <Button size="sm" variant="outline" disabled={offset === 0} onPress={() => setOffset(Math.max(0, offset - PAGE))}>{`‹ ${t('prev')}`}</Button>
            <Button size="sm" variant="outline" disabled={offset + PAGE >= total} onPress={() => setOffset(offset + PAGE)}>{`${t('next')} ›`}</Button>
          </View>
        </>
      )}

      {dialog?.kind === 'create' && res.create && (
        <FormDialog title={`${t('add')} · ${l(res.name)}`} fields={res.create.fields} initial={initialValues(res.create.fields, session)}
          onSubmit={async (v) => { await app.resources.create.execute(res, v); await done(); }} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'edit' && res.update && (() => {
        const row = dialog.row;
        const initial = initialValues(res.update.fields, session, row);
        return (
          <FormDialog title={`${t('edit')} · ${String(row[res.nameField] ?? '')}`} fields={res.update.fields} initial={initial}
            onSubmit={async (v) => {
              const diff = changes(res.update!.fields, initial, v);
              if (Object.keys(diff).length === 0) return;
              await app.resources.update.execute(res, row, diff); await done();
            }} onClose={() => setDialog(null)} />
        );
      })()}
      {dialog?.kind === 'action' && (() => {
        const { row, action } = dialog;
        return (
          <FormDialog title={`${l(action.key)} · ${String(row[res.nameField] ?? '')}`} fields={action.fields}
            initial={initialValues(action.fields, session, row, action.prefill)} submitLabel={t('confirm')}
            onSubmit={async (v) => {
              const out = await app.resources.runAction.execute(res, action, row, v);
              if (action.showResult) setDialog({ kind: 'result', title: l(action.key), data: out });
              else await done();
              if (action.showResult) throw new Error('');
            }} onClose={() => setDialog(null)} />
        );
      })()}
      {dialog?.kind === 'delete' && (
        <Modal title={t('confirmDelete')} onClose={() => setDialog(null)} footer={
          <Button variant="destructive" onPress={async () => {
            const row = dialog.row; setDialog(null);
            try { await app.resources.remove.execute(res, row); await done(); } catch (e) { setError(errorText(e)); }
          }}>{t('delete')}</Button>
        }>
          <Text className="text-sm text-foreground">{String(dialog.row[res.nameField] ?? dialog.row[res.idField])}</Text>
        </Modal>
      )}
      {dialog?.kind === 'detail' && <DetailModal res={res} row={dialog.row} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'result' && <Modal title={dialog.title} onClose={() => setDialog(null)}><Json data={dialog.data} /></Modal>}
    </View>
  );
}
