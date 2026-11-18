/** A business or system failure answered by the API (`code != 0`, or a non-2xx HTTP status). */
export class ApiError extends Error {
  constructor(
    message: string,
    /** envelope code: 400 / 401 / 403 / 404 / 409 for business errors, 500 / 502 for system errors */
    readonly code: number,
    /** fine-grained business code such as `system_role` or `duplicate_org_code` */
    readonly errorCode?: string,
    readonly httpStatus?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isUnauthenticated(): boolean {
    return this.code === 401;
  }

  get isSystemError(): boolean {
    return this.code >= 500;
  }
}
