import { SessionManager } from './application/session-manager';
import { LoadAccess } from './application/usecases/access';
import { EnterWithoutAuth, GetCaptcha, LoadSignInChoices, RegisterUser, SignIn, SignOut } from './application/usecases/auth';
import {
  CreateResource, DeleteResource, FindOutcome, GetConfigByKey, GetResource, ListResource, LoadFieldOptions, LoadTree, RunAction, UpdateResource,
} from './application/usecases/resources';
import type { AuthGateway, ResourceGateway, SessionStore } from './domain/ports';
import { createHttpGateways } from './infrastructure/http-gateway';
import { LocalSessionStore } from './infrastructure/local-session-store';

export interface AppDeps {
  resources: ResourceGateway;
  auth: AuthGateway;
  sessions: SessionManager;
}

/** Wires the use cases to the given ports. Tests pass fakes; the apps use `createHiaokApp`. */
export function createApp(deps: AppDeps) {
  const { resources, auth, sessions } = deps;
  return {
    sessions,
    auth: {
      captcha: new GetCaptcha(auth),
      signIn: new SignIn(auth, sessions),
      enterWithoutAuth: new EnterWithoutAuth(auth, sessions),
      register: new RegisterUser(auth),
      signOut: new SignOut(auth, sessions),
      choices: new LoadSignInChoices(resources),
      access: new LoadAccess(auth),
    },
    resources: {
      list: new ListResource(resources, sessions),
      tree: new LoadTree(resources, sessions),
      get: new GetResource(resources, sessions),
      configByKey: new GetConfigByKey(resources, sessions),
      create: new CreateResource(resources, sessions),
      update: new UpdateResource(resources, sessions),
      remove: new DeleteResource(resources, sessions),
      runAction: new RunAction(resources, sessions),
      options: new LoadFieldOptions(resources, sessions),
      outcome: new FindOutcome(resources, sessions),
    },
  };
}

export type App = ReturnType<typeof createApp>;

/** Composition root of the browser apps: localStorage session + the HTTP adapter. A 401 signs the user out. */
export function createHiaokApp(opts: { store?: SessionStore; fetch?: typeof fetch } = {}): App {
  const sessions = new SessionManager(opts.store ?? new LocalSessionStore(undefined, typeof navigator === 'undefined' ? undefined : navigator.language));
  const { resources, auth } = createHttpGateways({ session: sessions.get, onUnauthenticated: () => sessions.signOut(), fetch: opts.fetch });
  return createApp({ resources, auth, sessions });
}
