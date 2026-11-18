import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  changes, createRow, deleteRow, formatCell, initialValues, listRows, loadTree, resourceByName, runAction, updateRequest,
  updateRow, type ActionDef, type ResourceDef, type Row, type RowPage, type TreeNode, type Values,
} from '@hiaok/shared';
import { FormDialog, Modal } from './Form';
import { errorText, useApp } from './state';

const PAGE = 20;

function TreeView({ nodes, res, render }: { nodes: TreeNode[]; res: ResourceDef; render: (row: Row) => React.ReactNode }) {
  const { locale } = useApp();
  return (
    <ul>
      {nodes.map((n) => (
        <li key={String(n.item[res.idField])}>
          <div><b>{String(n.item[res.nameField] ?? '')}</b>
            <small>{formatCell(locale, 'state', n.item.state)}</small>{render(n.item)}</div>
          {n.children.length > 0 && <TreeView nodes={n.children} res={res} render={render} />}
        </li>
      ))}
    </ul>
  );
}

export function ResourcePage({ name }: { name: string }) {
  const { client, session, t, l, locale } = useApp();
  const res = useMemo(() => resourceByName(name), [name]);
  const [page, setPage] = useState<RowPage | null>(null);
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

  const needsOrg = res.scoped && !session.orgUuid;

  const load = useCallback(async () => {
    if (needsOrg) return;
    setLoading(true); setError('');
    try {
      if (asTree && res.tree) setTree(await loadTree(client, res, session));
      else setPage(await listRows(client, res, session, offset, PAGE, applied));
    } catch (e) { setError(errorText(e)); }
    finally { setLoading(false); }
  }, [client, res, session, offset, applied, asTree, needsOrg]);

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
      <button onClick={() => setDialog({ kind: 'detail', row })}>{t('details')}</button>
      {res.update && <button onClick={() => setDialog({ kind: 'edit', row })}>{t('edit')}</button>}
      {res.actions?.map((a) => <button key={a.key} onClick={() => setDialog({ kind: 'action', row, action: a })}>{l(a.key)}</button>)}
      {res.remove && <button className="danger" onClick={() => setDialog({ kind: 'delete', row })}>{t('delete')}</button>}
    </>
  );

  return (
    <div>
      <div className="bar">
        <h2>{l(res.name)}</h2>
        {res.create && <button className="primary" onClick={() => setDialog({ kind: 'create' })}>{t('add')}</button>}
        <button onClick={() => void load()}>{t('refresh')}</button>
        {res.tree && <button onClick={() => setAsTree(!asTree)}>{asTree ? t('listView') : t('treeView')}</button>}
        <span className="grow" />
        {!asTree && res.filters?.map((f) => (
          <input key={f.name} style={{ width: 160 }} placeholder={l(f.name)} value={String(filters[f.name] ?? '')}
            onChange={(e) => setFilters({ ...filters, [f.name]: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') { setOffset(0); setApplied(filters); } }} />
        ))}
        {!asTree && res.filters && <button onClick={() => { setOffset(0); setApplied(filters); }}>{t('search')}</button>}
      </div>

      {needsOrg && <div className="msg">{t('needOrg')}</div>}
      {error && <div className="msg bad">{error}</div>}
      {notice && <div className="msg ok">{notice}</div>}
      {loading && <div className="msg">{t('loading')}</div>}

      {asTree && tree && (
        tree.length === 0 ? <div className="msg">{t('empty')}</div> :
        <div className="card tree" style={{ maxWidth: 'none' }}><TreeView nodes={tree} res={res} render={(r) => <span className="row" style={{ flex: 'none' }}>{rowButtons(r)}</span>} /></div>
      )}

      {!asTree && page && (
        <>
          <div className="tablewrap">
            <table>
              <thead><tr>{res.columns.map((c) => <th key={c}>{l(c)}</th>)}<th>{t('actions')}</th></tr></thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={res.columns.length + 1}>{t('empty')}</td></tr>}
                {rows.map((row) => (
                  <tr key={String(row[res.idField])}>
                    {res.columns.map((c) => <td key={c} title={String(row[c] ?? '')}>{formatCell(locale, c, row[c])}</td>)}
                    <td className="acts">{rowButtons(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <span>{t('total')}: {total}</span>
            <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>{t('prev')}</button>
            <button disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>{t('next')}</button>
          </div>
        </>
      )}

      {dialog?.kind === 'create' && res.create && (
        <FormDialog title={`${t('add')} · ${l(res.name)}`} fields={res.create.fields} initial={initialValues(res.create.fields, session)}
          onSubmit={async (v) => { await createRow(client, res, session, v); await done(true); }} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'edit' && res.update && (() => {
        const row = dialog.row;
        const initial = initialValues(res.update.fields, session, row);
        return (
          <FormDialog title={`${t('edit')} · ${String(row[res.nameField] ?? '')}`} fields={res.update.fields} initial={initial}
            onSubmit={async (v) => {
              const diff = changes(res.update!.fields, initial, v);
              if (Object.keys(diff).length === 0) return;
              updateRequest(res, session, row, diff); // validates the shape before sending
              await updateRow(client, res, session, row, diff); await done(true);
            }} onClose={() => setDialog(null)} />
        );
      })()}
      {dialog?.kind === 'action' && (() => {
        const { row, action } = dialog;
        return (
          <FormDialog title={`${l(action.key)} · ${String(row[res.nameField] ?? '')}`} fields={action.fields}
            initial={initialValues(action.fields, session, row, action.prefill)} submitLabel={t('confirm')}
            onSubmit={async (v) => {
              const out = await runAction(client, res, action, session, row, v);
              if (action.showResult) setDialog({ kind: 'result', title: l(action.key), data: out });
              else await done(true);
              if (action.showResult) throw new Error('');
            }} onClose={() => setDialog(null)} />
        );
      })()}
      {dialog?.kind === 'delete' && (
        <Modal title={t('confirmDelete')} onClose={() => setDialog(null)}>
          <p>{String(dialog.row[res.nameField] ?? dialog.row[res.idField])}</p>
          <button className="danger" onClick={async () => {
            const row = dialog.row; setDialog(null);
            try { await deleteRow(client, res, session, row); await done(true); } catch (e) { setError(errorText(e)); }
          }}>{t('delete')}</button>
        </Modal>
      )}
      {dialog?.kind === 'detail' && <Modal title={String(dialog.row[res.nameField] ?? '')} onClose={() => setDialog(null)}><pre>{JSON.stringify(dialog.row, null, 2)}</pre></Modal>}
      {dialog?.kind === 'result' && <Modal title={dialog.title} onClose={() => setDialog(null)}><pre>{JSON.stringify(dialog.data, null, 2)}</pre></Modal>}
    </div>
  );
}
