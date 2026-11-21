import { actionRequest, createRequest, deleteRequest, listRequest, updateRequest } from '../requests';
import type { Option, ActionDef, ResourceDef, Row, Values, FieldDef } from '../../domain/resources';
import type { Outcome, Page, TreeNode } from '../../domain/model';
import type { ResourceGateway } from '../../domain/ports';
import type { SessionManager } from '../session-manager';

abstract class ResourceCase {
  constructor(protected readonly gateway: ResourceGateway, protected readonly sessions: SessionManager) {}
}

export class ListResource extends ResourceCase {
  execute(res: ResourceDef, offset: number, limit: number, filters?: Values): Promise<Page> {
    return this.gateway.list(res.name, listRequest(res, this.sessions.get(), offset, limit, filters));
  }
}

export class LoadTree extends ResourceCase {
  execute(res: ResourceDef): Promise<TreeNode[]> {
    return this.gateway.tree(res.name, { orgUuid: this.sessions.get().orgUuid });
  }
}

/** `<resource>/get`: the current server-side state of one row. */
export class GetResource extends ResourceCase {
  execute(res: ResourceDef, row: Row): Promise<Row> {
    const s = this.sessions.get();
    const request = res.selfOrg ? { orgUuid: row.orgUuid } : { ...(res.scoped ? { orgUuid: s.orgUuid } : {}), uuid: row[res.idField] };
    return this.gateway.get(res.name, 'get', request);
  }
}

/** Reads one configuration value by its key (`config/get-by-key`). */
export class GetConfigByKey extends ResourceCase {
  execute(configKey: string): Promise<Row> {
    return this.gateway.get('config', 'get-by-key', { orgUuid: this.sessions.get().orgUuid, configKey });
  }
}

/** Synchronous creates (user register, employee add) answer with the entity; the others are asynchronous. */
export class CreateResource extends ResourceCase {
  async execute(res: ResourceDef, values: Values): Promise<unknown> {
    const request = createRequest(res, this.sessions.get(), values);
    if (res.create?.sync) return this.gateway.call(res.name, res.name === 'user' ? 'register' : 'add', request);
    return this.gateway.write(res.name, 'add', request);
  }
}

export class UpdateResource extends ResourceCase {
  execute(res: ResourceDef, row: Row, changed: Values): Promise<Outcome> {
    return this.gateway.write(res.name, 'update', updateRequest(res, this.sessions.get(), row, changed));
  }
}

export class DeleteResource extends ResourceCase {
  execute(res: ResourceDef, row: Row): Promise<Outcome> {
    return this.gateway.write(res.name, 'delete', deleteRequest(res, this.sessions.get(), row));
  }
}

export class RunAction extends ResourceCase {
  async execute(res: ResourceDef, action: ActionDef, row: Row, values: Values): Promise<unknown> {
    const request = actionRequest(res, action, this.sessions.get(), row, values);
    if (action.sync) return this.gateway.call(res.name, action.endpoint, request);
    return this.gateway.write(res.name, action.endpoint, request);
  }
}

/** Options of a select field: its fixed options, or the referenced resource's list (first 200). */
export class LoadFieldOptions extends ResourceCase {
  async execute(field: FieldDef): Promise<Option[]> {
    if (field.options) return field.options;
    const ref = field.ref;
    if (!ref) return [];
    const page = await this.gateway.list(ref.resource, { orgUuid: this.sessions.get().orgUuid, offset: 0, limit: 200 });
    return page.items.map((row) => ({ value: String(row[ref.value]), label: String(row[ref.label] ?? row[ref.value]) }));
  }
}

/** What became of an earlier command, by its request id (`log/get-by-request`). */
export class FindOutcome extends ResourceCase {
  execute(requestId: string): Promise<Outcome> {
    return this.gateway.outcomeOf(this.sessions.get().orgUuid, requestId);
  }
}
