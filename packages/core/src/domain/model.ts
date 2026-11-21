import type { Row } from './resources';

/** Types the domain talks about; the adapters in `infrastructure` map the wire format onto them. */
export interface Page<T = Row> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface TreeNode {
  item: Row;
  children: TreeNode[];
}

/** Result of an asynchronous command once the server has processed it. */
export interface Outcome {
  requestId: string;
  status: 'success' | 'failed' | 'pending';
  code?: number;
  msg?: string | null;
  errorCode?: string | null;
}

export interface Captcha {
  /** false: the server has captcha switched off — send neither id nor code */
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

export interface Credentials {
  orgUuid: string;
  tenantUuid: string;
  username: string;
  password: string;
}

export interface TokenGrant {
  accessToken: string;
  userUuid: string;
}

export interface PrincipalData {
  userUuid: string;
  orgUuid: string;
  tenantUuid: string;
  roleCodes: string[];
  permissionCodes: string[];
}

export interface RegistrationInput extends Credentials, CaptchaAnswer {
  email?: string;
  phone?: string;
  nickname?: string;
}
