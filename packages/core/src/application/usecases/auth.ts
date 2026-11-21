import type { Captcha, CaptchaAnswer, Credentials, Page, RegistrationInput } from '../../domain/model';
import type { AuthGateway, ResourceGateway } from '../../domain/ports';
import type { SessionManager } from '../session-manager';

/** The challenge to show, or null when the server could not be asked (offline, wrong URL). */
export class GetCaptcha {
  constructor(private readonly auth: AuthGateway) {}
  async execute(): Promise<Captcha | null> {
    try {
      return await this.auth.captcha();
    } catch {
      return null;
    }
  }
}

/** Authenticates and starts the session. A captcha is single-use, so callers fetch a new one after every attempt. */
export class SignIn {
  constructor(private readonly auth: AuthGateway, private readonly sessions: SessionManager) {}
  async execute(input: Credentials & CaptchaAnswer): Promise<void> {
    const grant = await this.auth.login(input);
    this.sessions.update({ token: grant.accessToken, orgUuid: input.orgUuid, tenantUuid: input.tenantUuid, userUuid: grant.userUuid });
  }
}

/** The server runs with auth off: nothing to sign in to, so adopt the identity it reports. */
export class EnterWithoutAuth {
  constructor(private readonly auth: AuthGateway, private readonly sessions: SessionManager) {}
  async execute(chosen: { orgUuid?: string; tenantUuid?: string } = {}): Promise<void> {
    const me = await this.auth.me();
    this.sessions.update({
      token: null, orgUuid: chosen.orgUuid || me.orgUuid, tenantUuid: chosen.tenantUuid || me.tenantUuid, userUuid: me.userUuid,
    });
  }
}

export class RegisterUser {
  constructor(private readonly auth: AuthGateway) {}
  execute(input: RegistrationInput) {
    return this.auth.register(input);
  }
}

/** Ends the session on the server too (the token stops working), then clears it locally even if the server is unreachable. */
export class SignOut {
  constructor(private readonly auth: AuthGateway, private readonly sessions: SessionManager) {}
  async execute(): Promise<void> {
    try {
      if (this.sessions.get().token) await this.auth.logout();
    } catch {
      /* the local sign-out must not depend on the network */
    } finally {
      this.sessions.signOut();
    }
  }
}

export interface Choice {
  value: string;
  label: string;
}

/** Organizations and tenants offered on the sign-in screens; empty lists mean "type the UUID". */
export class LoadSignInChoices {
  constructor(private readonly resources: ResourceGateway) {}

  async organizations(): Promise<Choice[]> {
    try {
      return this.toChoices(await this.resources.list('organization', { offset: 0, limit: 200 }), 'orgUuid', 'orgName', 'orgCode');
    } catch {
      return [];
    }
  }

  async tenants(orgUuid: string): Promise<Choice[]> {
    if (!orgUuid) return [];
    try {
      return this.toChoices(await this.resources.list('tenant', { orgUuid, offset: 0, limit: 200 }), 'tenantUuid', 'tenantName', 'tenantCode');
    } catch {
      return [];
    }
  }

  private toChoices(page: Page, id: string, name: string, code: string): Choice[] {
    return page.items.map((r) => ({ value: String(r[id]), label: `${r[name]} (${r[code]})` }));
  }
}
