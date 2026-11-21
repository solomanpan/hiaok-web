import { Access } from '../../domain/access';
import type { AuthGateway } from '../../domain/ports';

/** The signed-in user's permissions. Falls back to "everything visible" when the server does not say (auth off). */
export class LoadAccess {
  constructor(private readonly auth: AuthGateway) {}
  async execute(): Promise<Access> {
    try {
      return new Access(await this.auth.me());
    } catch {
      return Access.everything;
    }
  }
}
