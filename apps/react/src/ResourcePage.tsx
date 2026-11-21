import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  changes, formatCell, initialValues, resourceByName, type ActionDef, type Page, type ResourceDef, type Row, type TreeNode, type Values,
} from '@hiaok/core';
import { ChevronLeft, ChevronRight, ListTree, Plus, RefreshCw, Search, Table2 } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FormDialog, Modal } from './Form';
import { errorText, useApp } from './state';

const PAGE = 20;

function StateBadge({ value }: { value: unknown }) {
  const { locale } = useApp();
  if (value === null || value === undefined) return null;
  return <Badge variant={Number(value) === 0 ? 'success' : 'destructive'}>{formatCell(locale, 'state', value)}</Badge>;
}

function TreeView({ nodes, res, render }: { nodes: TreeNode[]; res: ResourceDef; render: (row: Row) => React.ReactNode }) {
  return (
    <ul className="space-y-0.5 pl-5 first:pl-0">
      {nodes.map((n) => (
        <li key={String(n.item[res.idField])}>
          <div className="flex flex-wrap items-center gap-2 rounded-md px-2 py-1 hover:bg-accent">
            <b>{String(n.item[res.nameField] ?? '')}</b>
            <StateBadge value={n.item.state} />
            <span className="ml-auto flex gap-1.5">{render(n.item)}</span>
          </div>
          {n.children.length > 0 && <TreeView nodes={n.children} res={res} render={render} />}
        </li>
      ))}
    </ul>
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
  return (
    <Modal title={String(fresh[res.nameField] ?? '')} onClose={onClose}>
      <pre className="max-h-[50vh] overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(fresh, null, 2)}</pre>
    </Modal>
  );
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

  const done = async (what: unknown) => {
    setNotice(`${t('done')}${what ? '' : ''}`);
    await load();
  };

  const rows = page?.items ?? [];
  const total = page?.total ?? 0;
  const rowButtons = (row: Row) => (
    <>
      <Button size="sm" variant="outline" onClick={() => setDialog({ kind: 'detail', row })}>{t('details')}</Button>
      {res.update && access.can(res, 'update') && <Button size="sm" variant="outline" onClick={() => setDialog({ kind: 'edit', row })}>{t('edit')}</Button>}
      {res.actions?.filter((a) => access.can(res, a.endpoint)).map((a) => <Button size="sm" variant="secondary" key={a.key} onClick={() => setDialog({ kind: 'action', row, action: a })}>{l(a.key)}</Button>)}
      {res.remove && access.can(res, 'delete') && <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDialog({ kind: 'delete', row })}>{t('delete')}</Button>}
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-2 text-2xl font-semibold tracking-tight">{l(res.name)}</h2>
        {res.create && access.can(res, 'add') && <Button onClick={() => setDialog({ kind: 'create' })}><Plus />{t('add')}</Button>}
        <Button variant="outline" onClick={() => void load()}><RefreshCw />{t('refresh')}</Button>
        {res.tree && access.can(res, 'tree') && <Button variant="outline" onClick={() => setAsTree(!asTree)}>{asTree ? <Table2 /> : <ListTree />}{asTree ? t('listView') : t('treeView')}</Button>}
        <span className="flex-1" />
        {res.lookup && (
          <>
            <Input className="w-48" placeholder={l(res.lookup.field)} value={lookupText} onChange={(e) => setLookupText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void lookup(); }} />
            <Button variant="outline" onClick={() => void lookup()}><Search />{t('search')}</Button>
          </>
        )}
        {!asTree && res.filters?.map((f) => (
          <Input key={f.name} className="w-40" placeholder={l(f.name)} value={String(filters[f.name] ?? '')}
            onChange={(e) => setFilters({ ...filters, [f.name]: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') { setOffset(0); setApplied(filters); } }} />
        ))}
        {!asTree && res.filters && <Button variant="outline" onClick={() => { setOffset(0); setApplied(filters); }}><Search />{t('search')}</Button>}
      </div>

      {needsOrg && <Alert>{t('needOrg')}</Alert>}
      {error && <Alert variant="destructive">{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}
      {loading && <Alert>{t('loading')}</Alert>}

      {asTree && tree && (
        tree.length === 0 ? <Alert>{t('empty')}</Alert> :
        <Card className="p-3"><TreeView nodes={tree} res={res} render={rowButtons} /></Card>
      )}

      {!asTree && page && (
        <>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader><TableRow>{res.columns.map((c) => <TableHead key={c}>{l(c)}</TableHead>)}<TableHead>{t('actions')}</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.length === 0 && <TableRow><TableCell colSpan={res.columns.length + 1} className="py-8 text-center text-muted-foreground">{t('empty')}</TableCell></TableRow>}
                {rows.map((row) => (
                  <TableRow key={String(row[res.idField])}>
                    {res.columns.map((c) => (
                      <TableCell key={c} title={String(row[c] ?? '')}>
                        {c === 'state' ? <StateBadge value={row[c]} /> : formatCell(locale, c, row[c])}
                      </TableCell>
                    ))}
                    <TableCell><div className="flex gap-1.5">{rowButtons(row)}</div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
            <span className="mr-2">{t('total')}: {total}</span>
            <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}><ChevronLeft />{t('prev')}</Button>
            <Button size="sm" variant="outline" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>{t('next')}<ChevronRight /></Button>
          </div>
        </>
      )}

      {dialog?.kind === 'create' && res.create && (
        <FormDialog title={`${t('add')} · ${l(res.name)}`} fields={res.create.fields} initial={initialValues(res.create.fields, session)}
          onSubmit={async (v) => { await app.resources.create.execute(res, v); await done(true); }} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'edit' && res.update && (() => {
        const row = dialog.row;
        const initial = initialValues(res.update.fields, session, row);
        return (
          <FormDialog title={`${t('edit')} · ${String(row[res.nameField] ?? '')}`} fields={res.update.fields} initial={initial}
            onSubmit={async (v) => {
              const diff = changes(res.update!.fields, initial, v);
              if (Object.keys(diff).length === 0) return;
                            await app.resources.update.execute(res, row, diff); await done(true);
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
              else await done(true);
              if (action.showResult) throw new Error('');
            }} onClose={() => setDialog(null)} />
        );
      })()}
      {dialog?.kind === 'delete' && (
        <Modal title={t('confirmDelete')} onClose={() => setDialog(null)} footer={
          <Button variant="destructive" onClick={async () => {
            const row = dialog.row; setDialog(null);
            try { await app.resources.remove.execute(res, row); await done(true); } catch (e) { setError(errorText(e)); }
          }}>{t('delete')}</Button>
        }>
          <p className="break-all text-sm">{String(dialog.row[res.nameField] ?? dialog.row[res.idField])}</p>
        </Modal>
      )}
      {dialog?.kind === 'detail' && <DetailModal res={res} row={dialog.row} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'result' && <Modal title={dialog.title} onClose={() => setDialog(null)}><pre className="max-h-[50vh] overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(dialog.data, null, 2)}</pre></Modal>}
    </div>
  );
}
