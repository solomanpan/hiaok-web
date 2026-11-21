import type { Captcha, CaptchaAnswer, Credentials, Outcome, Page, PrincipalData, RegistrationInput, TokenGrant, TreeNode } from './model';
import type { Row } from './resources';
import type { Session } from './session';

/** Outbound ports: what the application needs from the outside world. `infrastructure` implements them. */

export interface ResourceGateway {
  list(resource: string, request: object): Promise<Page>;
  tree(resource: string, request: object): Promise<TreeNode[]>;
  /** `<resource>/get` and any other single-row read */
  get(resource: string, endpoint: string, request: object): Promise<Row>;
  /** an endpoint that answers directly (register, change-password, authorities ...) */
  call<T = unknown>(resource: string, endpoint: string, request: object): Promise<T>;
  /** a command the server processes asynchronously: resolves when it succeeded, rejects with its failure */
  write(resource: string, endpoint: string, request: object): Promise<Outcome>;
  /** what became of an earlier command (`log/get-by-request`) */
  outcomeOf(orgUuid: string, requestId: string): Promise<Outcome>;
}

export interface AuthGateway {
  captcha(): Promise<Captcha>;
  login(credentials: Credentials & CaptchaAnswer): Promise<TokenGrant>;
  register(input: RegistrationInput): Promise<Row>;
  logout(): Promise<void>;
  me(): Promise<PrincipalData>;
}

export interface SessionStore {
  load(): Session;
  save(session: Session): void;
}
