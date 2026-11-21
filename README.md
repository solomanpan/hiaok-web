# hiaok-web

Front end of the **hiaok permission center** — React and Nuxt 3 (both TypeScript), plus a Tauri 2 shell so the same app runs on **desktop, Android and iOS**.

[中文](#中文) · [日本語](#日本語)

It talks to the hiaok back end (`POST /v1/api/hiaok/<resource>/<action>` with `{requestId, reqInfo}`) and covers every resource: organization, tenant, user, role, permission, menu, project, group, department, employee, config and log — list / filter / create / edit / delete, plus the special actions (assign roles, grant permissions, assign menus, change password, view authorities, move, appoint head, transfer, resign, update organization detail). Sign-in, registration and captcha are built in.

## Layout

```
packages/api-client   typed client: envelope, ApiError, submit + poll for the asynchronous writes
packages/core         the application, layered like the back ends (see below)
apps/react            Vite + React 19 + Tailwind + shadcn/ui
apps/nuxt             Nuxt 3, SPA (`ssr: false`) + Tailwind + shadcn-vue — same pages, same registry
src-tauri             Tauri 2 shell (desktop + mobile) around the React build
```

**UI**: Tailwind CSS v4 with shadcn/ui — `apps/react/src/components/ui` (Radix primitives) and, for Nuxt, the shadcn-vue counterpart `apps/nuxt/components/ui` (Reka UI). Both use the same theme tokens (`styles.css`: light/dark follows the OS, `--primary` etc.), so restyling is one file. The components are source files in the repo, as in shadcn: edit them freely. Selects are the styled native `<select>` (shadcn "native select"), which behaves best inside iOS / Android web views.

### Layers (`packages/core/src`)

```
domain/           Session, Access (what the user may do), the resource catalog (RESOURCES), ports (ResourceGateway, AuthGateway, SessionStore)
application/      use cases (SignIn, SignOut, RegisterUser, ListResource, CreateResource, RunAction, LoadAccess ...),
                  form + request logic, SessionManager
infrastructure/   adapters: HTTP gateways over api-client, localStorage session store
app.ts            composition root: createHiaokApp() wires use cases to adapters
i18n/             messages and labels (en / zh / ja)
```

Dependencies point inward and a test enforces it (`architecture.test.ts`): `domain` imports nothing outside itself, `application` never touches `infrastructure` or the HTTP client. The React and Nuxt apps depend only on `@hiaok/core` and call use cases — they never see HTTP. Tests swap the gateways for fakes.

Both apps render every list, form and action **from `RESOURCES`** — a new endpoint is a few lines in `packages/shared/src/resources.ts`, not a new page.

## Run

```bash
npm install
npm run dev:react        # http://localhost:5173
npm run dev:nuxt         # http://localhost:3000
npm run typecheck && npm test && npm run build
```

In dev, leave **Server URL** empty and `/v1` is proxied to `http://localhost:8000` (`VITE_API_PROXY` / `NUXT_API_PROXY` change the target). Against another host, set the Server URL on the sign-in page and allow the origin on the server:

```
APP_CORS_ORIGINS=http://localhost:5173,http://localhost:3000,tauri://localhost,http://tauri.localhost
AUTH_CAPTCHA_ENABLED=true     # optional: login and register then require a captcha
```

The **Backend** selector switches the URL prefix (`hiaok`, `kimoj`, `ladepa`) — the Go and Rust ports speak the same API.

## How the pages behave

- **Sign in** — organizations and tenants come from the open `organization/list` and `tenant/list` endpoints; if they are not available you type the UUIDs. A captcha image appears when the server requires one (click it to refresh). A wrong captcha burns the challenge, so a fresh one is loaded after every attempt. "Server has auth off" enters without a token when the server runs with `AUTH_ENABLED=false`.
- **Register** — `user/register`, with the same captcha handling. Passwords need 8+ characters.
- **Writes** are asynchronous on the server (`accepted` first); the UI waits for the outcome through `log/get-by-request` and shows success or the failure reason.
- `state` is `0 = enabled`, `1 = disabled`; `permType` / `menuType` are menu / api / button.
- **Sign out** ends the session on the server too (`auth/logout`), then clears it locally even if the server is unreachable.
- **Permissions**: for guarded resources (role, menu) the navigation and the buttons follow the user's permission codes (`role:list`, `role:*`, `*`); with auth off nothing is hidden.
- Detail dialogs fetch the current row (`<resource>/get`); the log page looks up a command by request id, the config page a value by key.
- Language (English / 中文 / 日本語) is switchable on every screen; the session is kept in local storage.

## Desktop and mobile (Tauri 2)

```bash
npm run desktop:dev                       # desktop window around the Vite dev server
npm run desktop:build                     # installers for the current OS
npx tauri android init && npm run android:dev    # needs Android Studio / SDK / NDK
npx tauri ios init     && npm run ios:dev        # macOS + Xcode only
```

The shell only hosts the web view; the app speaks plain HTTP to the server. A mobile or packaged desktop app has its own origin, so put it in `APP_CORS_ORIGINS` (above) and use an `https://` Server URL in production (Android blocks cleartext by default). `app-icon.png` is a placeholder — replace it and run `npx tauri icon app-icon.png`. The Nuxt app is a static build too (`npm run build -w @hiaok/nuxt` → `apps/nuxt/.output/public`); point `frontendDist` there to ship it instead.

> The Tauri desktop / Android / iOS builds need their native toolchains and have not been built in the authoring environment; the web apps are type-checked, tested and were exercised against a live hiaok server.

## 中文

hiaok 权限中心的前端：React 与 Nuxt 3（TypeScript），并用 Tauri 2 打包成 **桌面 / Android / iOS** 应用。覆盖 hiaok 全部接口资源（组织、租户、用户、角色、权限、菜单、项目、用户组、部门、员工、系统配置、日志），内置登录、注册与验证码。

- 开发：`npm install && npm run dev:react`（或 `dev:nuxt`）；服务地址留空时 `/v1` 代理到 `localhost:8000`。
- 服务端需允许来源：`APP_CORS_ORIGINS=http://localhost:5173,tauri://localhost`；开启验证码：`AUTH_CAPTCHA_ENABLED=true`。
- 写操作在服务端是异步的，界面会自动轮询结果并显示成功或失败原因。
- 移动端/桌面端构建见上文 Tauri 部分（需要各自的原生工具链）。

## 日本語

hiaok 権限センターのフロントエンド。React と Nuxt 3（TypeScript）、Tauri 2 で **デスクトップ / Android / iOS** に対応します。全リソース（組織・テナント・ユーザー・ロール・権限・メニュー・プロジェクト・グループ・部門・従業員・設定・ログ）を操作でき、ログイン・登録・認証コードを備えます。

- 開発: `npm install && npm run dev:react`（または `dev:nuxt`）。サーバー URL が空なら `/v1` は `localhost:8000` にプロキシされます。
- サーバー側: `APP_CORS_ORIGINS=http://localhost:5173,tauri://localhost`、認証コードは `AUTH_CAPTCHA_ENABLED=true`。
- 書き込みは非同期で、結果を自動でポーリングして表示します。

## License

MIT
