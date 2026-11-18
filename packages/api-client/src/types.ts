/** Wire types of the permission-center API (camelCase). Shared by hiaok, kimoj and ladepa. */
export interface Envelope<T> {
  code: number;
  msg: string;
  resultInfo: T | null;
  errorCode?: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface PageRequest {
  offset?: number;
  limit?: number;
}

export interface Entity {
  orgUuid: string;
  description?: string | null;
  remark?: string | null;
  /** 0 = enabled, 1 = disabled (hiaok) */
  state: number;
  createTime?: string | null;
  updateTime?: string | null;
  opr?: string | null;
}

export interface Organization extends Entity {
  orgCode: string;
  orgName: string;
}

export interface Permission extends Entity {
  permissionUuid: string;
  permCode: string;
  permName: string;
  /** 0 menu, 1 api, 2 button */
  permType: number;
  resource?: string | null;
  action?: string | null;
  menuUuid?: string | null;
}

export interface Role extends Entity {
  roleUuid: string;
  tenantUuid: string;
  roleCode: string;
  roleName: string;
  /** 0 system, 1 custom */
  roleType: number;
  permissionUuids: string[];
}

export interface RoleAssignment {
  roleUuid: string;
  projectUuid?: string;
}

export interface User extends Entity {
  userUuid: string;
  tenantUuid: string;
  username: string;
  email?: string | null;
  phone?: string | null;
  groupUuid?: string | null;
  lastLoginTime?: string | null;
  roles: RoleAssignment[];
}

export interface Accepted {
  requestId: string;
  uuid: string;
  status: 'accepted';
}

export type OutcomeStatus = 'success' | 'failed' | 'pending';

export interface Outcome {
  requestId: string;
  status: OutcomeStatus;
  commandType?: string | null;
  uuid?: string | null;
  code: number;
  msg?: string | null;
  errorCode?: string | null;
}

export interface LoginResult {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  userUuid: string;
}

export interface Principal {
  userUuid: string;
  orgUuid: string;
  tenantUuid: string;
  roleCodes: string[];
  permissionCodes: string[];
}

export interface Authorities {
  userUuid: string;
  roleCodes: string[];
  permissionCodes: string[];
}

export interface MetaCreate {
  description?: string;
  remark?: string;
}

export interface MetaUpdate extends MetaCreate {
  state?: number;
}

export interface Captcha {
  /** false: the server has captcha switched off; send no captchaId / captchaCode */
  required: boolean;
  captchaId?: string | null;
  /** `data:image/svg+xml;base64,...` */
  image?: string | null;
  expiresIn?: number | null;
}

export interface CaptchaAnswer {
  captchaId?: string;
  captchaCode?: string;
}
