import type { Locale } from './messages';
import { enumLabelKey } from './operations';

/** [field / word, zh, ja]; English is derived from the name (`orgCode` -> "Org code"). */
const WORDS: [string, string, string][] = [
  ['orgUuid', '组织 UUID', '組織 UUID'], ['tenantUuid', '租户', 'テナント'], ['uuid', 'UUID', 'UUID'],
  ['orgCode', '组织编码', '組織コード'], ['orgName', '组织名称', '組織名'],
  ['tenantCode', '租户编码', 'テナントコード'], ['tenantName', '租户名称', 'テナント名'], ['expireTime', '到期时间', '有効期限'],
  ['username', '用户名', 'ユーザー名'], ['password', '密码', 'パスワード'], ['newPassword', '新密码', '新しいパスワード'],
  ['email', '邮箱', 'メール'], ['phone', '手机号', '電話'], ['nickname', '昵称', 'ニックネーム'], ['realName', '真实姓名', '氏名'],
  ['avatarUrl', '头像地址', 'アバター URL'], ['gender', '性别', '性別'], ['birthday', '生日', '生年月日'], ['locale', '语言', '言語'],
  ['timezone', '时区', 'タイムゾーン'], ['lastLoginTime', '最近登录', '最終ログイン'],
  ['roleCode', '角色编码', 'ロールコード'], ['roleName', '角色名称', 'ロール名'], ['roleType', '角色类型', 'ロール種別'],
  ['roleUuids', '角色', 'ロール'], ['permissionUuids', '权限', '権限'], ['menuUuids', '菜单', 'メニュー'],
  ['permCode', '权限编码', '権限コード'], ['permName', '权限名称', '権限名'], ['permType', '权限类型', '権限種別'],
  ['resource', '资源', 'リソース'], ['action', '动作', 'アクション'], ['menuUuid', '菜单', 'メニュー'],
  ['menuCode', '菜单编码', 'メニューコード'], ['menuName', '菜单名称', 'メニュー名'], ['menuType', '菜单类型', 'メニュー種別'],
  ['parentUuid', '上级', '親'], ['path', '路径', 'パス'], ['component', '组件', 'コンポーネント'], ['icon', '图标', 'アイコン'],
  ['sortOrder', '排序', '並び順'], ['visible', '可见', '表示'],
  ['projectCode', '项目编码', 'プロジェクトコード'], ['projectName', '项目名称', 'プロジェクト名'], ['ownerUserUuid', '负责人', '責任者'],
  ['groupCode', '分组编码', 'グループコード'], ['groupName', '分组名称', 'グループ名'], ['groupUuid', '用户组', 'ユーザーグループ'],
  ['parentGroupUuid', '上级分组', '親グループ'],
  ['departmentCode', '部门编码', '部門コード'], ['departmentName', '部门名称', '部門名'], ['departmentUuid', '部门', '部門'],
  ['parentDepartmentUuid', '上级部门', '親部門'], ['employeeUuid', '部门负责人', '部門長'],
  ['employeeNo', '工号', '社員番号'], ['employeeName', '姓名', '氏名'], ['position', '职位', '役職'],
  ['hireDate', '入职日期', '入社日'], ['leaveDate', '离职日期', '退職日'],
  ['configKey', '配置键', '設定キー'], ['configValue', '配置值', '設定値'], ['valueType', '值类型', '値の型'], ['configGroup', '配置分组', '設定グループ'],
  ['logType', '日志类型', 'ログ種別'], ['eventType', '事件类型', 'イベント種別'], ['aggregateId', '聚合 ID', '集約 ID'],
  ['traceId', '追踪 ID', 'トレース ID'], ['occurredAt', '发生时间', '発生日時'], ['content', '内容', '内容'],
  ['description', '描述', '説明'], ['remark', '备注', '備考'], ['state', '状态', '状態'], ['createTime', '创建时间', '作成日時'],
  ['detail', '详情', '詳細'], ['roles', '角色', 'ロール'],
  ['legalName', '法定名称', '正式名称'], ['registrationNo', '注册号', '登録番号'], ['address', '地址', '住所'], ['postalCode', '邮编', '郵便番号'],
  ['contactName', '联系人', '連絡先名'], ['contactPhone', '联系电话', '連絡先電話'], ['contactEmail', '联系邮箱', '連絡先メール'], ['website', '网站', 'ウェブサイト'],
  ['projectUuid', '项目', 'プロジェクト'], ['captchaCode', '验证码', '認証コード'],
  // enumerations
  ['enabled', '启用', '有効'], ['disabled', '停用', '無効'], ['menu', '菜单', 'メニュー'], ['api', '接口', 'API'], ['button', '按钮', 'ボタン'],
  ['system', '系统', 'システム'], ['custom', '自定义', 'カスタム'],
  // resources
  ['organization', '组织', '組織'], ['tenant', '租户', 'テナント'], ['user', '用户', 'ユーザー'], ['role', '角色', 'ロール'],
  ['permission', '权限', '権限'], ['project', '项目', 'プロジェクト'], ['group', '用户组', 'ユーザーグループ'],
  ['department', '部门', '部門'], ['employee', '员工', '従業員'], ['config', '系统配置', 'システム設定'], ['log', '日志', 'ログ'],
  // actions
  ['updateDetail', '更新详情', '詳細を更新'], ['assignRoles', '分配角色', 'ロールを割り当て'], ['changePassword', '修改密码', 'パスワード変更'],
  ['authorities', '查看权限', '権限を表示'], ['grantPermissions', '授予权限', '権限を付与'], ['assignMenus', '分配菜单', 'メニューを割り当て'],
  ['move', '移动', '移動'], ['appointHead', '任命负责人', '部門長を任命'], ['transfer', '调动', '異動'], ['resign', '离职', '退職'],
];

const INDEX = new Map(WORDS.map((w) => [w[0], w]));

export function humanize(name: string): string {
  const last = name.split('.').pop() ?? name;
  const spaced = last.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/Uuid$/, ' UUID').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Label of a field, resource, action or enum word in the given language (English derived from the name). */
export function label(locale: Locale, name: string): string {
  const last = name.split('.').pop() ?? name;
  const w = INDEX.get(last);
  if (w && locale === 'zh') return w[1];
  if (w && locale === 'ja') return w[2];
  return humanize(last);
}

export function formatCell(locale: Locale, column: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const enumKey = enumLabelKey(column, value);
  if (enumKey) return label(locale, enumKey);
  if (typeof value === 'boolean') return value ? '✓' : '✗';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString(locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : 'en-US');
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
