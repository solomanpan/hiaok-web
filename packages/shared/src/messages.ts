export type Locale = 'en' | 'zh' | 'ja';
export const LOCALES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'English' }, { code: 'zh', label: '中文' }, { code: 'ja', label: '日本語' },
];

const en = {
  appName: 'Permission Center',
  signIn: 'Sign in', signOut: 'Sign out', serverUrl: 'Server URL', backend: 'Backend',
  orgUuid: 'Organization UUID', tenantUuid: 'Tenant UUID', username: 'Username', password: 'Password',
  organizations: 'Organizations', permissions: 'Permissions', roles: 'Roles', users: 'Users',
  add: 'Add', create: 'Create', delete: 'Delete', refresh: 'Refresh', cancel: 'Cancel', save: 'Save',
  orgCode: 'Org code', orgName: 'Org name', permCode: 'Code', permName: 'Name', permType: 'Type',
  roleCode: 'Code', roleName: 'Name', roleType: 'Type', email: 'Email', phone: 'Phone', state: 'State',
  enabled: 'Enabled', disabled: 'Disabled', system: 'System', custom: 'Custom',
  grant: 'Grant permissions', permissionsOfRole: 'Permissions of role', register: 'Register user',
  total: 'Total', empty: 'Nothing here yet', loading: 'Loading…', working: 'Working…',
  done: 'Done', language: 'Language', actions: 'Actions', confirmDelete: 'Delete this item?',
  menu: 'Menu', api: 'API', button: 'Button', currentOrg: 'Organization', tenant: 'Tenant',
  needOrg: 'Enter an organization UUID to browse its data', openOrg: 'Open',
  assignRoles: 'Assign roles', roleUuids: 'Role UUIDs (comma separated)',
  captcha: 'Captcha', refreshCaptcha: 'Refresh captcha', noAccount: 'No account? Register', haveAccount: 'Have an account? Sign in',
  registered: 'Registered. You can sign in now.', authOff: 'Server has auth off — enter', nickname: 'Nickname',
  prev: 'Previous', next: 'Next', edit: 'Edit', details: 'Details', treeView: 'Tree', listView: 'List', search: 'Search',
  close: 'Close', confirm: 'Confirm', pick: 'Select…', manual: 'Enter manually', failed: 'Failed', accepted: 'Accepted', fieldRequired: 'Required field missing',
} as const;

export type MessageKey = keyof typeof en;

const zh: Record<MessageKey, string> = {
  appName: '权限中心',
  signIn: '登录', signOut: '退出登录', serverUrl: '服务地址', backend: '后端',
  orgUuid: '组织 UUID', tenantUuid: '租户 UUID', username: '用户名', password: '密码',
  organizations: '组织', permissions: '权限', roles: '角色', users: '用户',
  add: '新增', create: '创建', delete: '删除', refresh: '刷新', cancel: '取消', save: '保存',
  orgCode: '组织编码', orgName: '组织名称', permCode: '编码', permName: '名称', permType: '类型',
  roleCode: '编码', roleName: '名称', roleType: '类型', email: '邮箱', phone: '手机号', state: '状态',
  enabled: '启用', disabled: '停用', system: '系统', custom: '自定义',
  grant: '授予权限', permissionsOfRole: '角色权限', register: '注册用户',
  total: '共', empty: '暂无数据', loading: '加载中…', working: '处理中…',
  done: '完成', language: '语言', actions: '操作', confirmDelete: '确定删除吗？',
  menu: '菜单', api: '接口', button: '按钮', currentOrg: '组织', tenant: '租户',
  needOrg: '请输入组织 UUID 以查看数据', openOrg: '打开',
  assignRoles: '分配角色', roleUuids: '角色 UUID（逗号分隔）',
  captcha: '验证码', refreshCaptcha: '刷新验证码', noAccount: '没有账号？去注册', haveAccount: '已有账号？去登录',
  registered: '注册成功，请登录。', authOff: '服务端未开启认证——直接进入', nickname: '昵称',
  prev: '上一页', next: '下一页', edit: '编辑', details: '详情', treeView: '树形', listView: '列表', search: '搜索',
  close: '关闭', confirm: '确定', pick: '请选择…', manual: '手动输入', failed: '失败', accepted: '已受理', fieldRequired: '缺少必填项',
};

const ja: Record<MessageKey, string> = {
  appName: '権限センター',
  signIn: 'ログイン', signOut: 'ログアウト', serverUrl: 'サーバー URL', backend: 'バックエンド',
  orgUuid: '組織 UUID', tenantUuid: 'テナント UUID', username: 'ユーザー名', password: 'パスワード',
  organizations: '組織', permissions: '権限', roles: 'ロール', users: 'ユーザー',
  add: '追加', create: '作成', delete: '削除', refresh: '更新', cancel: 'キャンセル', save: '保存',
  orgCode: '組織コード', orgName: '組織名', permCode: 'コード', permName: '名前', permType: '種別',
  roleCode: 'コード', roleName: '名前', roleType: '種別', email: 'メール', phone: '電話', state: '状態',
  enabled: '有効', disabled: '無効', system: 'システム', custom: 'カスタム',
  grant: '権限を付与', permissionsOfRole: 'ロールの権限', register: 'ユーザー登録',
  total: '合計', empty: 'データがありません', loading: '読み込み中…', working: '処理中…',
  done: '完了', language: '言語', actions: '操作', confirmDelete: '削除しますか？',
  menu: 'メニュー', api: 'API', button: 'ボタン', currentOrg: '組織', tenant: 'テナント',
  needOrg: '組織 UUID を入力してください', openOrg: '開く',
  assignRoles: 'ロールを割り当て', roleUuids: 'ロール UUID（カンマ区切り）',
  captcha: '認証コード', refreshCaptcha: '認証コードを更新', noAccount: 'アカウントがない？登録', haveAccount: 'アカウントあり？ログイン',
  registered: '登録しました。ログインしてください。', authOff: 'サーバーは認証オフ — 入る', nickname: 'ニックネーム',
  prev: '前へ', next: '次へ', edit: '編集', details: '詳細', treeView: 'ツリー', listView: 'リスト', search: '検索',
  close: '閉じる', confirm: 'OK', pick: '選択…', manual: '手入力', failed: '失敗', accepted: '受付済み', fieldRequired: '必須項目がありません',
};

export const messages: Record<Locale, Record<MessageKey, string>> = { en, zh, ja };

export function translate(locale: Locale, key: MessageKey): string {
  return messages[locale][key] ?? en[key];
}

export function detectLocale(navigatorLanguage?: string): Locale {
  const l = (navigatorLanguage ?? '').toLowerCase();
  if (l.startsWith('zh')) return 'zh';
  if (l.startsWith('ja')) return 'ja';
  return 'en';
}
