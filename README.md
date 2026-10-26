# ShotAPI

把公开 URL 或一段 HTML 渲染成 PNG、JPEG 或 PDF 的 API（MVP）。请求带 API Key，成功一次记一次用量。对外标价 ShotAPI Pro **$19/月**。收款默认走 Creem；没有 Creem 密钥时，有 Stripe 密钥走 Stripe 沙箱，否则走 demo 结账。接口照常可用。

英文接口说明在应用里的 [`/docs`](http://localhost:3000/docs)。落地页和文档里的 curl 示例默认指向 `https://shotapi-three.vercel.app`，可用 `NEXT_PUBLIC_APP_URL` 覆盖。下面的命令仍是本机地址。

## 本地运行

需要 Node.js 22+、pnpm，以及本机 Google Chrome（macOS / Linux / Windows 的常见安装路径会自动查找）。

```bash
pnpm install
pnpm dev
```

不复制环境变量也能在本地跑：未设置 `VERCEL` 时 demo 模式默认开启，并写入演示密钥 `sk_demo_local_dev_only`。用量落在 `.data/store.json`（已 gitignore）。

```bash
cp .env.example .env.local   # 可选
pnpm test                    # 单元测试 + 真实渲染
pnpm build && pnpm start
pnpm smoke                   # 另开终端，对着已启动的服务
```

`CHROME_PATH` 指向 Chrome 可执行文件。容器里默认关闭 sandbox（`SHOTAPI_CHROME_NO_SANDBOX=1`）。桌面环境若要打开 sandbox，设为 `0`。

## 环境变量

| 变量 | 作用 |
| --- | --- |
| `SHOTAPI_DEMO` | `1` 开启演示密钥和落地页预览。`0` 关闭。不设置时：本地开，Vercel 关。 |
| `SHOTAPI_DEMO_KEY` | 演示密钥明文。默认 `sk_demo_local_dev_only`。这是公开示例，生产环境不要用。 |
| `SHOTAPI_ADMIN_TOKEN` | 调用 `POST /api/v1/keys` 时的管理口令。不设置则不能签发新密钥。 |
| `SHOTAPI_DATA_DIR` | 本地文件库目录，默认 `.data`。单进程。 |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | 都设置后，用量写入 Upstash。Vercel 上建议打开，否则用量只在当前实例内存里。 |
| `SHOTAPI_QUOTA_DEMO` / `SHOTAPI_QUOTA_PRO` | 每月成功渲染次数，默认 100 / 10000。 |
| `RENDER_DRIVER` | `auto`（默认）、`chrome`、`sparticuz`。`auto` 在 Vercel 上用 Sparticuz Chromium，其它环境用本机 Chrome。 |
| `CHROME_PATH` | 本机 Chrome 路径。 |
| `CHROMIUM_PACK_URL` | 可选。把 Sparticuz 的 `chromium-*-pack.tar` 放到你自己的地址，函数启动时下载，避免把 64MB 的 `chromium.br` 打进部署包。 |
| `ALLOW_PRIVATE_URLS` | `1` 才允许截内网 / 本机。默认拒绝。 |
| `RENDER_TIMEOUT_MS` | 单次渲染超时，默认 25000。 |
| `SHOTAPI_MAX_HTML_BYTES` | HTML 上限，默认 500000。 |
| `NEXT_PUBLIC_APP_URL` | 结账回跳用的公网 origin。 |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | 法律页和页脚上的支持邮箱。默认 `support@shotapi.dev`。 |
| `BILLING_PROVIDER` | `creem`、`paddle`、`stripe` 或 `demo`。不设置时：有 `CREEM_API_KEY` 用 Creem，否则有 `STRIPE_SECRET_KEY` 用 Stripe，否则 demo。 |
| `CREEM_API_KEY` | Creem API key。测试和正式环境的 key 不同。 |
| `CREEM_PRODUCT_ID` | Creem 里 Pro 订阅产品的 id。 |
| `CREEM_WEBHOOK_SECRET` | Creem webhook 签名密钥。用来校验 `creem-signature`。 |
| `CREEM_TEST_MODE` | `1` 时 checkout 打到 `https://test-api.creem.io`。默认走正式 API。 |
| `STRIPE_SECRET_KEY` | Stripe 沙箱。Creem 未配置、或 `BILLING_PROVIDER=stripe` 时使用。 |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook 签名密钥。 |
| `STRIPE_PRICE_ID` | Stripe 订阅价格，必须是 recurring price。 |
| `STRIPE_METER_EVENT_NAME` | 可选。每次成功渲染上报 Billing Meter。Meter 的 payload 键默认是 `stripe_customer_id` 和 `value`。 |

完整模板见 [`.env.example`](.env.example)。不要把真实密钥提交进仓库。

## curl

演示密钥只在 `SHOTAPI_DEMO` 开启时有效。

PNG：

```bash
curl -sS -X POST http://localhost:3000/api/v1/render \
  -H "authorization: Bearer sk_demo_local_dev_only" \
  -H "content-type: application/json" \
  -o shot.png \
  -d '{"html":"<h1>Hello</h1>","format":"png","viewport":{"width":1280,"height":720}}'
```

PDF：

```bash
curl -sS -X POST http://localhost:3000/api/v1/render \
  -H "authorization: Bearer sk_demo_local_dev_only" \
  -H "content-type: application/json" \
  -o page.pdf \
  -d '{"url":"https://example.com","format":"pdf"}'
```

用量：

```bash
curl -sS http://localhost:3000/api/v1/usage \
  -H "authorization: Bearer sk_demo_local_dev_only"
```

签发密钥（先在环境变量里设置 `SHOTAPI_ADMIN_TOKEN`）：

```bash
curl -sS -X POST http://localhost:3000/api/v1/keys \
  -H "authorization: Bearer $SHOTAPI_ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{"name":"acme","plan":"demo"}'
```

结账。当前 provider 是 demo 时返回 mock URL，打开后点 “Mark as paid”，该密钥升到 Pro 配额。Creem 或 Stripe 则返回托管结账 URL：

```bash
curl -sS -X POST http://localhost:3000/api/v1/billing/checkout \
  -H "authorization: Bearer sk_demo_local_dev_only"
```

成功响应带 `x-shotapi-usage` 和 `x-shotapi-limit`。配额用尽返回 402。

## 部署到 Vercel

1. 把仓库导入 Vercel，框架选 Next.js，Node 22。
2. 生产环境不要设 `SHOTAPI_DEMO=1`，除非你接受公开演示密钥。
3. 设置 `SHOTAPI_ADMIN_TOKEN`，部署后用它签发真正的 key。
4. 设置 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`。不设置的话，`/api/v1/health` 里 `storage` 为 `memory`、`persistent` 为 `false`，实例回收后用量归零。
5. `RENDER_DRIVER` 保持 `auto`。Vercel 上会走 `@sparticuz/chromium` + `playwright-core`。Playwright 启动时用 `path.join(packageRoot, "browsers.json")` 读描述文件，Next 的文件追踪跟不住这条计算路径。pnpm 下 `packageRoot` 是 `node_modules/.pnpm/playwright-core@…` 的真实目录，不是 `node_modules/playwright-core` 软链。`next.config.ts` 会把这个 `browsers.json` 和 `@sparticuz/chromium` 的 `bin/*.br` 打进 `/api/v1/render`、`/api/v1/demo/render` 和 `/api/v1/health`。部署后可在构建产物上跑 `pnpm verify:trace` 确认追踪列表里同时有 `lib/coreBundle.js` 和它旁边的 `browsers.json`。
6. 函数内存：Fluid Compute 下在项目 Settings → Functions 里选至少 Standard（2 GB）。不要在 `vercel.json` 里写 `memory`。路由上的 `maxDuration` 是 60 秒。包没打全时，渲染返回的 `browser_missing` 以前会误写成内存不足；`/api/v1/health` 现在只有浏览器文件真能加载时才报 `browser=sparticuz`，否则 `browser` 为 `missing` 且 `ok` 为 false。
7. 正式收款用 Creem（商户主体，支持中国个人卖家和支付宝）。在 Creem 建一个月付 19 美元的 Pro 订阅产品，然后设置 `CREEM_API_KEY`、`CREEM_PRODUCT_ID`、`CREEM_WEBHOOK_SECRET`。Webhook 指到 `https://shotapi-three.vercel.app/api/v1/billing/webhook/creem`，至少订阅 `checkout.completed`、`subscription.paid`、`subscription.canceled`、`subscription.expired`。测试阶段再加 `CREEM_TEST_MODE=1`，并使用测试环境的 API key 和产品。
8. Stripe 只作沙箱回退，不要删。`BILLING_PROVIDER=stripe`，或没配 Creem 但配了 `STRIPE_SECRET_KEY` 时走 Stripe。Webhook 仍是 `https://<你的域名>/api/v1/billing/webhook`，监听 `checkout.session.completed`、`customer.subscription.updated`、`customer.subscription.deleted`。`BILLING_PROVIDER=paddle` 先留着，结账会返回 501。
9. 设置 `NEXT_PUBLIC_APP_URL` 为正式 origin，按需设置 `NEXT_PUBLIC_SUPPORT_EMAIL`。公开法律页在 `/legal/terms`、`/legal/privacy`、`/legal/refund`。

如果部署包超过函数体积上限，改用自托管的 pack：把 [Sparticuz Chromium release](https://github.com/Sparticuz/chromium/releases) 里的 `chromium-v153.0.0-pack.tar` 放到你的存储，设置 `CHROMIUM_PACK_URL`。当前依赖的 `@sparticuz/chromium@153.0.0` 自带约 64MB 的 `chromium.br`，一般低于 250MB 的解压上限。

另一条路：同一套 Next 应用跑在带 Chrome 的虚拟机或容器上（`RENDER_DRIVER=chrome`）。Serverless 上不放浏览器。代码不必拆成第二个服务。

## Creem 测试模式

不产生真实扣款。仪表盘左下角打开 Test Mode，产品和 API key 都用测试环境的。

1. 建一个按月订阅的产品，复制 product id 到 `CREEM_PRODUCT_ID`。
2. 设置 `CREEM_API_KEY`（测试 key）、`CREEM_WEBHOOK_SECRET`、`CREEM_TEST_MODE=1`、`NEXT_PUBLIC_APP_URL`。不要设 `BILLING_PROVIDER=stripe`，否则会绕开 Creem。
3. 在 Creem 测试环境把 webhook 指到 `https://shotapi-three.vercel.app/api/v1/billing/webhook/creem`。本地调试可以用隧道把同一路径暴露出去。
4. 用已有 API key 调用 `POST /api/v1/billing/checkout`。响应里 `mode` 为 `creem`。打开 `url`，用测试卡 `4111 1111 1111 1111`（任意未来有效期和任意 CVC）完成支付。
5. `checkout.completed` 或 `subscription.paid` 到达后，`GET /api/v1/usage` 的 `plan` 应为 `pro`。密钥记录上会写入 `creemCustomerId`、`creemSubscriptionId` 和 `billingProvider`。
6. 在测试仪表盘取消订阅。`subscription.canceled` 或 `subscription.expired` 之后，plan 回到 `demo`。只安排期末取消（`subscription.scheduled_cancel`）不会提前降级。

签名错误的 webhook 会返回 400。正式上线时换正式 API key 和产品，并把 `CREEM_TEST_MODE` 设为 `0` 或删掉。

## 限制

- Vercel 请求/响应体上限 4.5MB。超长整页截图会返回 413。
- Sparticuz Chromium 第一次调用要解压到 `/tmp`，冷启动数秒，内存建议 2GB。该二进制面向 Amazon Linux，不能拿来在普通 macOS / 桌面 Linux 上当本地浏览器；本地用系统 Chrome。
- 默认拦截私网、localhost、云 metadata 地址，以及页面里转向这些地址的导航。DNS rebinding 仍是残余风险。
- 不转发 Cookie，不能截需要登录的页面。
- `networkidle` 可能把超时时间用满。
- 文件库只适合单进程。Vercel 无 Upstash 时用量不持久。
- 渲染不受信任的页面时，把进程放在容器里。默认关闭了 Chrome sandbox，否则很多容器起不来。
- 配额是先检查再渲染，并发请求可能略微超出月度上限。
- Demo 密钥写在 README 里，只为本地演示。

## 目录

- `app/api/v1/render` 认证渲染
- `app/api/v1/usage` 用量
- `app/api/v1/keys` 管理口令签发密钥
- `app/api/v1/billing/*` Creem、Stripe 沙箱，或 demo 结账
- `app/legal/*` 服务条款、隐私政策、退款政策
- `lib/render.ts` 选择 Chrome 或 Sparticuz
- `lib/store.ts` 文件 / 内存 / Upstash
