import { createClient } from '@hiaok/api-client';
import type { AuthGateway, ResourceGateway } from '../domain/ports';
import type { Outcome, TreeNode } from '../domain/model';
import type { Row } from '../domain/resources';
import type { Session } from '../domain/session';

export interface HttpOptions {
  /** always the current session: server URL, backend prefix, token and language are read on every call */
  session: () => Session;
  onUnauthenticated?: () => void;
  fetch?: typeof fetch;
}

/** Adapter: the hiaok / kimoj / ladepa HTTP API behind the two gateway ports. */
export function createHttpGateways(opts: HttpOptions): { resources: ResourceGateway; auth: AuthGateway } {
  const client = createClient({
    get baseUrl() { return opts.session().baseUrl; },
    get prefix() { return `/v1/api/${opts.session().backend}`; },
    getToken: () => opts.session().token,
    getLocale: () => opts.session().locale,
    onUnauthenticated: opts.onUnauthenticated,
    fetch: opts.fetch,
  } as Parameters<typeof createClient>[0]);

  const resources: ResourceGateway = {
    list: (resource, request) => client.call(resource, 'list', request),
    tree: (resource, request) => client.call<TreeNode[]>(resource, 'tree', request),
    get: (resource, endpoint, request) => client.call<Row>(resource, endpoint, request),
    call: (resource, endpoint, request) => client.call(resource, endpoint, request),
    write: async (resource, endpoint, request) => (await client.write(resource, endpoint, request)).outcome as Outcome,
    outcomeOf: (orgUuid, requestId) => client.outcome(orgUuid, requestId) as Promise<Outcome>,
  };

  const auth: AuthGateway = {
    captcha: () => client.auth.captcha(),
    login: (c) => client.auth.login(c),
    register: (i) => client.users.register(i as Parameters<typeof client.users.register>[0]) as unknown as Promise<Row>,
    logout: async () => { await client.auth.logout(); },
    me: () => client.auth.me(),
  };
  return { resources, auth };
}
