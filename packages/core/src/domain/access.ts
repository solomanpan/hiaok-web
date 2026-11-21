import type { PrincipalData } from './model';
import type { ResourceDef } from './resources';

/**
 * What the signed-in user may do. The server guards some resources with `<resource>:<endpoint>` codes
 * (`role:list`, `menu:tree`; `role:*` covers the resource, `*` everything) — this mirrors that rule so the UI can hide
 * what would only answer 403. Without a principal (auth off, or `auth/me` unavailable) nothing is hidden.
 */
export class Access {
  constructor(private readonly principal: PrincipalData | null) {}

  static everything = new Access(null);

  can(res: ResourceDef, endpoint: string): boolean {
    if (!this.principal || !res.guarded) return true;
    const codes = this.principal.permissionCodes ?? [];
    return codes.includes('*') || codes.includes(`${res.name}:*`) || codes.includes(`${res.name}:${endpoint}`);
  }

  canOpen(res: ResourceDef): boolean {
    return this.can(res, 'list') || this.can(res, 'tree');
  }
}
