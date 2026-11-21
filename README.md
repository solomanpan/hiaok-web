# hiaok-web

Front end of the **hiaok permission center** — **one React Native (Expo) app in TypeScript** that runs on **iOS, Android, the web and the desktop**. It covers every resource of the hiaok API (and its Go / Rust ports): organizations, tenants, users, roles, permissions, menus, projects, groups, departments, employees, configs, logs — plus sign-in, registration and captcha.

```
apps/app              Expo (React Native 0.88) + NativeWind (Tailwind CSS) — iOS, Android, web (react-native-web)
packages/core         framework-free DDD core: domain / application / infrastructure
packages/api-client   typed HTTP client for the hiaok API
tests/                every test of the repository (separate from the source)
src-tauri             Tauri 2 desktop shell around the Expo web export
```

**One app, four targets**: `expo start --ios/--android` runs native; `expo export -p web` builds the browser version; the **desktop** app is that web build inside a Tauri 2 window (no second UI to maintain). **UI**: NativeWind brings Tailwind classes to React Native; the components in `apps/app/src/ui.tsx` are shadcn-style source files (Button, Input, Select, Dialog, Checkbox, Alert, Badge, Card) and the theme tokens are in `apps/app/global.css`. Lists are shown as cards, which fit a phone as well as a desktop window.

### Layers (`packages/core/src`)

```
domain/           Session, Access (what the user may do), the resource catalog (RESOURCES), ports (ResourceGateway, AuthGateway, SessionStore)
application/      use cases (SignIn, SignOut, RegisterUser, ListResource, CreateResource, RunAction, LoadAccess ...),
                  form + request logic, SessionManager
infrastructure/   adapters: HTTP gateways over api-client, localStorage session store
app.ts            composition root: createHiaokApp() wires use cases to adapters
i18n/             messages and labels (en / zh / ja)
```

Dependencies point inward and a test enforces it (`tests/core/architecture.test.ts`): `domain` imports nothing outside itself, `application` never touches `infrastructure` or the HTTP client. The React and Nuxt apps depend only on `@hiaok/core` and call use cases — they never see HTTP. Tests swap the gateways for fakes.

All tests live in the separate `tests/` bundle (`@hiaok/tests`: `api-client/`, `core/`, `react/`), never next to the source. Run them with `npm test`.

The app depends only on `@hiaok/core` and calls use cases — it never sees HTTP. Another React front end (Next.js, a Vite SPA, ...) could reuse the same core unchanged.

Every list, form and action is rendered **from `RESOURCES`** — a new endpoint is a few lines in `packages/core/src/domain/resources.ts`, not a new page.

This repository is also a **front-end DDD example**; the back end it talks to, [hiaok](https://github.com/solomanpan/hiaok), applies the same ideas in Python (shared kernel: [hiaok-core](https://github.com/solomanpan/hiaok-core)). hiaok's README follows a sign-in through both sides.

### Follow one request: signing in

```
Login.submit()                                apps/app/src/Auth.tsx                (UI)
→ app.auth.signIn.execute(credentials)        core/application/usecases/auth.ts   (SignIn use case)
→ AuthGateway.login()                         core/domain/ports.ts                (port)
→ client.auth.login()                         core/infrastructure/http-gateway.ts (adapter)
→ client.call('auth', 'login', reqInfo)       packages/api-client/src/client.ts
    POST {baseUrl}/v1/api/{backend}/auth/login   body {requestId, reqInfo}
    code != 0 → ApiError (401 also signs out)   code == 0 → resultInfo
← SignIn: sessions.update({token, orgUuid, tenantUuid, userUuid})
→ SessionManager saves it and notifies listeners → AppProvider re-renders (useSyncExternalStore)
→ LoadAccess: auth/me (Bearer token) → Access(permission codes)
→ Shell: the menu shows RESOURCES the user may open; each button checks access.can(res, endpoint)
```

The UI only ever calls use cases (`useApp().app.<area>.<case>.execute()`); the server URL, backend prefix, token and language are read from the session on every call, so changing them on the sign-in page takes effect at once.

### Adding a page

**A list / form page for a back-end resource** — no new component: add an entry to `RESOURCES` in `packages/core/src/domain/resources.ts` (`name`, `idField`, `columns`, `create` / `update` fields, `actions` for extra endpoints), and its words to `packages/core/src/i18n/labels.ts`. The menu, list, paging, filters, forms, delete and action buttons appear, guarded by the `<name>:<endpoint>` permission codes.

**A custom page** — go through the layers, inside out:

1. `domain/ports.ts` + `infrastructure/http-gateway.ts` — only if the page needs a new capability from the server (add the method to `packages/api-client` first).
2. `application/usecases/<area>.ts` — a use case class with `execute()`, depending on ports only; export it from `src/index.ts`.
3. `app.ts` — register it in `createApp()`.
4. `apps/app/src/<Page>.tsx` — the component, calling `useApp().app.<area>.<case>.execute()`; React Native primitives (`View`, `Text`, `Pressable`) and the components of `ui.tsx`, styled with Tailwind classes.
5. `apps/app/src/state.tsx` (`Route`) and `App.tsx` (`Menu`, `Shell`) — the route and the menu entry.
6. `i18n/messages.ts` — the texts, in `en`, `zh` and `ja` (the keys are typed from `en`).
7. Tests in `tests/core` (the use case with fake gateways) and `tests/react` (the page through `render(<App />)` with a stubbed `fetch`), then `npm test && npm run typecheck`.

### Design decisions and non-goals

Decisions:

- **A framework-free core.** `packages/core` has no React import; the same use cases could back another UI (Next.js, Vite, Vue) or a CLI.
- **Pages as data.** Every resource page is rendered from `RESOURCES`; one generic `ResourcePage` replaces a dozen hand-written CRUD screens.
- **No router, no state library.** A three-state route (`login` / `register` / `resource`) and one `SessionManager` read through `useSyncExternalStore` are enough here, and work the same on every platform.
- **No dev proxy.** The server URL is typed on the sign-in page and kept in the session, so one build talks to any hiaok (or kimoj / ladepa) server.
- **Asynchronous writes made visible.** A write waits for its outcome (`log/get-by-request`) and shows success or the server's reason, instead of assuming `accepted` means done.
- **Permission-aware UI, server-enforced rules.** The menu and buttons hide what would answer 403, but the server's guards remain the authority.

Not done, on purpose (it is a lightweight console):

- The side menu comes from `RESOURCES`, not from the menu tree that `auth/me` returns; the menus managed in the console do not reshape it.
- No token refresh: when the session expires (2 h by default) the user signs in again.
- Changes to the signed-in user's own roles apply after signing in again or reloading.
- No offline mode, no optimistic updates, no real-time push.
- Only username + password sign-in (plus captcha): no SMS, e-mail code or third-party login.
- The native iOS / Android builds and the Tauri bundles have not been built in the authoring environment (see below).

## Run

```bash
npm install
npm run web        # http://localhost:8081 (Expo web dev server)
npm run ios        # simulator / device through Expo (macOS + Xcode)
npm run android    # emulator / device through Expo (Android Studio)
```

There is no dev proxy: enter the **Server URL** on the sign-in page (e.g. `http://localhost:8000`) and let the server accept the origin: `APP_CORS_ORIGINS=http://localhost:8081,tauri://localhost,http://tauri.localhost` (native apps do not use CORS). Turn the captcha on with `AUTH_CAPTCHA_ENABLED=true`. The **Backend** selector switches the URL prefix (`hiaok`, `kimoj`, `ladepa`).

```bash
npm test           # all tests (vitest; the app renders through react-native-web in jsdom)
npm run typecheck
npm run build      # expo export -p web  ->  apps/app/dist
```

## How the pages behave

- **Sign in** — organizations and tenants come from the open `organization/list` and `tenant/list` endpoints; if they are not available you type the UUIDs. A captcha image appears when the server requires one (click it to refresh). A wrong captcha burns the challenge, so a fresh one is loaded after every attempt. "Server has auth off" enters without a token when the server runs with `AUTH_ENABLED=false`.
- **Register** — `user/register`, with the same captcha handling. Passwords need 8+ characters.
- **Writes** are asynchronous on the server (`accepted` first); the UI waits for the outcome through `log/get-by-request` and shows success or the failure reason.
- `state` is `0 = enabled`, `1 = disabled`; `permType` / `menuType` are menu / api / button.
- **Sign out** ends the session on the server too (`auth/logout`), then clears it locally even if the server is unreachable.
- **Permissions**: every resource is guarded on the server, so the navigation and the buttons follow the user's permission codes (`role:list`, `role:*`, `*`; the sign-in page's organization / tenant lists need `organization:list` / `tenant:list`, so with auth on you type the UUIDs); with auth off nothing is hidden.
- Detail dialogs fetch the current row (`<resource>/get`); the log page looks up a command by request id, the config page a value by key.
- Language (English / 中文 / 日本語) is switchable on every screen; the session is kept in the platform's secure storage (keychain / keystore on iOS and Android, local storage on the web).

## Desktop (Tauri 2)

```bash
npm run desktop:dev       # a desktop window around the Expo web dev server
npm run desktop:build     # installers; builds apps/app/dist first
```

> The native iOS / Android builds and the Tauri desktop bundles need their toolchains and have not been built in the authoring environment; the app type-checks, its web export builds, and the tests (core, API client, and the app in jsdom) pass.

## 中文

hiaok 权限中心的前端：**一套 React Native（Expo）TypeScript 代码**，同时运行在 **iOS / Android / Web / 桌面**。覆盖 hiaok 全部接口资源，含登录、注册、验证码。

- 目录：`apps/app`（Expo + NativeWind/Tailwind）、`packages/core`（不依赖框架的 DDD 核心）、`packages/api-client`、`tests/`（所有测试，与源码分离）、`src-tauri`（桌面壳）。
- 开发：`npm install && npm run web`（或 `npm run ios` / `npm run android`）；在登录页填写服务地址，服务端需允许来源：`APP_CORS_ORIGINS=http://localhost:8081,tauri://localhost`；开启验证码：`AUTH_CAPTCHA_ENABLED=true`。
- 桌面端：Tauri 2 包装 Expo 的 Web 构建（`npm run desktop:dev` / `desktop:build`）。
- 测试：`npm test`（均位于 `tests/`）。原生与桌面构建需要各自的工具链，尚未在编写环境中实际构建。
- 也是一个**前端 DDD 示例**：调用链为 UI → 用例（application）→ 端口（domain/ports）→ HTTP 适配器（infrastructure）→ api-client，见上文 “Follow one request”；新增页面的步骤见 “Adding a page”。后端 [hiaok](https://github.com/solomanpan/hiaok) 用 Python 实践同样的分层。
- 设计取舍与不做的事见 “Design decisions and non-goals”：核心不依赖框架、页面由 `RESOURCES` 数据驱动、不用路由库和状态库、无开发代理、异步写入等待结果；不做后端菜单树驱动的侧边栏、token 续期、离线与实时推送、短信或第三方登录。

## 日本語

hiaok 権限センターのフロントエンド。**React Native（Expo）の TypeScript コード 1 本**で **iOS / Android / Web / デスクトップ**に対応します。hiaok の全リソースのほか、ログイン・登録・認証コードを備えます。

- 構成: `apps/app`（Expo + NativeWind/Tailwind）、`packages/core`（フレームワーク非依存の DDD コア）、`packages/api-client`、`tests/`（全テスト。ソースと分離）、`src-tauri`（デスクトップシェル）。
- 開発: `npm install && npm run web`（または `npm run ios` / `npm run android`）。ログイン画面でサーバー URL を入力し、サーバー側で `APP_CORS_ORIGINS=http://localhost:8081,tauri://localhost` を許可、認証コードは `AUTH_CAPTCHA_ENABLED=true`。
- デスクトップ: Tauri 2 が Expo の Web ビルドを包みます（`npm run desktop:dev` / `desktop:build`）。
- テスト: `npm test`（すべて `tests/` 配下）。ネイティブ／デスクトップのビルドには各ツールチェーンが必要で、作成環境では未ビルドです。
- **フロントエンド DDD の実例**でもあります。呼び出し経路は UI → ユースケース（application）→ ポート（domain/ports）→ HTTP アダプター（infrastructure）→ api-client（上の “Follow one request”）。ページ追加の手順は “Adding a page” を参照。バックエンド [hiaok](https://github.com/solomanpan/hiaok) は同じ考え方を Python で実践しています。
- 設計上の選択と非目標は “Design decisions and non-goals” を参照: フレームワーク非依存のコア、`RESOURCES` によるデータ駆動のページ、ルーター／状態管理ライブラリなし、開発プロキシなし、非同期書き込みの結果待ち。サーバーのメニューツリーによるサイドメニュー、トークン更新、オフライン／リアルタイム通知、SMS や外部ログインは対象外です。
