import { ApiError } from './errors';
import type {
  Accepted, Authorities, Captcha, CaptchaAnswer, Envelope, LoginResult, MetaCreate, MetaUpdate, Organization, Outcome, Page,
  PageRequest, Permission, Principal, Role, RoleAssignment, User,
} from './types';

export interface ClientOptions {
  /** e.g. `http://localhost:8000`; empty = same origin (use a dev proxy or a reverse proxy) */
  baseUrl?: string;
  /** `/v1/api/hiaok` (default); kimoj and ladepa expose `/v1/api/kimoj` and `/v1/api/ladepa` */
  prefix?: string;
  getToken?: () => string | null | undefined;
  /** sent as Accept-Language: en | zh | ja */
  getLocale?: () => string | null | undefined;
  fetch?: typeof fetch;
  /** called for every 401 answer (to send the user back to the login page) */
  onUnauthenticated?: () => void;
}

export interface WaitOptions {
  timeoutMs?: number;
  intervalMs?: number;
  signal?: AbortSignal;
}

export function newRequestId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID().replace(/-/g, '');
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 12)}`;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('aborted', 'AbortError'));
    });
  });

export function createClient(opts: ClientOptions = {}) {
  // read on every call: the server URL and backend can change while the client lives (settings on the sign-in page)
  const prefix = () => (opts.prefix ?? '/v1/api/hiaok').replace(/\/$/, '');
  const base = () => (opts.baseUrl ?? '').replace(/\/$/, '');
  const doFetch = opts.fetch ?? ((...a: Parameters<typeof fetch>) => globalThis.fetch(...a));

  /** One API call. Resolves with `resultInfo`; rejects with [`ApiError`] on `code != 0`. */
  async function call<T>(resource: string, action: string, reqInfo: object = {}, requestId = newRequestId()): Promise<T> {
    const headers: Record<string, string> = { 'content-type': 'application/json', 'x-request-id': requestId };
    const token = opts.getToken?.();
    if (token) headers.authorization = `Bearer ${token}`;
    const locale = opts.getLocale?.();
    if (locale) headers['accept-language'] = locale;

    let res: Response;
    try {
      res = await doFetch(`${base()}${prefix()}/${resource}/${action}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ requestId, reqInfo }),
      });
    } catch (e) {
      throw new ApiError(e instanceof Error ? e.message : 'network error', 0, 'network_error');
    }
    let body: Envelope<T> | null = null;
    try {
      body = (await res.json()) as Envelope<T>;
    } catch {
      /* not JSON */
    }
    if (!body) throw new ApiError(`HTTP ${res.status}`, res.status, 'bad_response', res.status);
    if (body.code !== 0) {
      if (body.code === 401) opts.onUnauthenticated?.();
      throw new ApiError(body.msg, body.code, body.errorCode, res.status);
    }
    return body.resultInfo as T;
  }

  const list = <T>(resource: string, info: object) => call<Page<T>>(resource, 'list', info);

  /** Writes are asynchronous: the API answers `accepted`; the outcome is looked up by request id. */
  async function submit(resource: string, action: string, reqInfo: object, requestId = newRequestId()): Promise<Accepted> {
    return call<Accepted>(resource, action, reqInfo, requestId);
  }

  async function outcome(orgUuid: string, targetRequestId: string): Promise<Outcome> {
    return call<Outcome>('log', 'get-by-request', { orgUuid, targetRequestId });
  }

  /** Polls until the command finished. Resolves on `success`, rejects with [`ApiError`] on `failed` or timeout. */
  async function waitForOutcome(orgUuid: string, requestId: string, o: WaitOptions = {}): Promise<Outcome> {
    const timeout = o.timeoutMs ?? 15_000;
    const interval = o.intervalMs ?? 200;
    const started = Date.now();
    for (;;) {
      const out = await outcome(orgUuid, requestId);
      if (out.status === 'success') return out;
      if (out.status === 'failed') throw new ApiError(out.msg ?? 'command failed', out.code || 400, out.errorCode ?? undefined);
      if (Date.now() - started > timeout) throw new ApiError('timed out waiting for the command', 504, 'outcome_timeout');
      await sleep(interval, o.signal);
    }
  }

  /** submit + wait. For organization creation the log is stored under the new organization's uuid. */
  async function write(
    resource: string, action: string, reqInfo: object, o: WaitOptions = {},
  ): Promise<{ uuid: string; outcome: Outcome }> {
    const requestId = newRequestId();
    const accepted = await submit(resource, action, reqInfo, requestId);
    const scope = (reqInfo as { orgUuid?: string }).orgUuid || accepted.uuid;
    return { uuid: accepted.uuid, outcome: await waitForOutcome(scope, requestId, o) };
  }

  return {
    call, submit, outcome, waitForOutcome, write,

    auth: {
      captcha: () => call<Captcha>('auth', 'captcha', {}),
      login: (i: { orgUuid: string; tenantUuid: string; username: string; password: string } & CaptchaAnswer) => call<LoginResult>('auth', 'login', i),
      logout: () => call<Record<string, never>>('auth', 'logout', {}),
      me: () => call<Principal>('auth', 'me', {}),
    },
    organizations: {
      list: (p: PageRequest = {}) => list<Organization>('organization', p),
      get: (orgUuid: string) => call<Organization>('organization', 'get', { orgUuid }),
      add: (i: MetaCreate & { orgCode: string; orgName: string }, o?: WaitOptions) => write('organization', 'add', i, o),
      update: (i: MetaUpdate & { orgUuid: string; orgName?: string }, o?: WaitOptions) => write('organization', 'update', i, o),
      delete: (orgUuid: string, o?: WaitOptions) => write('organization', 'delete', { orgUuid }, o),
    },
    permissions: {
      list: (orgUuid: string, p: PageRequest = {}) => list<Permission>('permission', { orgUuid, ...p }),
      get: (orgUuid: string, uuid: string) => call<Permission>('permission', 'get', { orgUuid, uuid }),
      add: (i: MetaCreate & { orgUuid: string; permCode: string; permName: string; permType?: number; resource?: string; action?: string }, o?: WaitOptions) =>
        write('permission', 'add', i, o),
      update: (i: MetaUpdate & { orgUuid: string; uuid: string; permName?: string }, o?: WaitOptions) => write('permission', 'update', i, o),
      delete: (orgUuid: string, uuid: string, o?: WaitOptions) => write('permission', 'delete', { orgUuid, uuid }, o),
    },
    roles: {
      list: (orgUuid: string, p: PageRequest = {}) => list<Role>('role', { orgUuid, ...p }),
      get: (orgUuid: string, uuid: string) => call<Role>('role', 'get', { orgUuid, uuid }),
      add: (i: MetaCreate & { orgUuid: string; tenantUuid: string; roleCode: string; roleName: string; roleType?: number }, o?: WaitOptions) =>
        write('role', 'add', i, o),
      update: (i: MetaUpdate & { orgUuid: string; uuid: string; roleName?: string }, o?: WaitOptions) => write('role', 'update', i, o),
      delete: (orgUuid: string, uuid: string, o?: WaitOptions) => write('role', 'delete', { orgUuid, uuid }, o),
      grantPermissions: (orgUuid: string, uuid: string, permissionUuids: string[], o?: WaitOptions) =>
        write('role', 'grant-permissions', { orgUuid, uuid, permissionUuids }, o),
    },
    users: {
      list: (orgUuid: string, p: PageRequest = {}) => list<User>('user', { orgUuid, ...p }),
      get: (orgUuid: string, uuid: string) => call<User>('user', 'get', { orgUuid, uuid }),
      register: (i: MetaCreate & CaptchaAnswer & { orgUuid: string; tenantUuid: string; username: string; password: string; email?: string; phone?: string; nickname?: string; roleUuids?: string[] }) =>
        call<User>('user', 'register', i),
      update: (i: MetaUpdate & { orgUuid: string; uuid: string; email?: string; phone?: string }, o?: WaitOptions) => write('user', 'update', i, o),
      delete: (orgUuid: string, uuid: string, o?: WaitOptions) => write('user', 'delete', { orgUuid, uuid }, o),
      assignRoles: (orgUuid: string, uuid: string, roles: RoleAssignment[], o?: WaitOptions) => write('user', 'assign-roles', { orgUuid, uuid, roles }, o),
      changePassword: (orgUuid: string, uuid: string, newPassword: string) => call<Record<string, never>>('user', 'change-password', { orgUuid, uuid, newPassword }),
      authorities: (orgUuid: string, uuid: string, projectUuid?: string) => call<Authorities>('user', 'authorities', { orgUuid, uuid, projectUuid }),
    },
  };
}

export type Client = ReturnType<typeof createClient>;
