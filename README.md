# ShotAPI

把公开 URL 或一段 HTML 渲染成 PNG、JPEG 或 PDF 的 API（MVP）。请求带 API Key，成功一次记一次用量。没有 Stripe 密钥时走 demo 计费，接口照常可用。

英文接口说明在应用里的 [`/docs`](http://localhost:3000/docs)。

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
| `NEXT_PUBLIC_APP_URL` | Stripe 回跳用的公网 origin。 |
| `STRIPE_SECRET_KEY` | 留空则 demo 结账。 |
| `STRIPE_WEBHOOK_SECRET` | Webhook 签名密钥。 |
| `STRIPE_PRICE_ID` | 订阅价格，必须是 recurring price。 |
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

结账。没有 Stripe 时返回 demo URL，打开后点 “Mark as paid”，该密钥升到 Pro 配额：

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
5. `RENDER_DRIVER` 保持 `auto`。Vercel 上会走 `@sparticuz/chromium` + `playwright-core`。
6. 函数内存：Fluid Compute 下在项目 Settings → Functions 里选至少 Standard（2 GB）。不要在 `vercel.json` 里写 `memory`。路由上的 `maxDuration` 是 60 秒。
7. 要收款时再填 `STRIPE_SECRET_KEY`、`STRIPE_PRICE_ID`、`STRIPE_WEBHOOK_SECRET`，并把 Webhook 指到 `https://<你的域名>/api/v1/billing/webhook`，监听 `checkout.session.completed`、`customer.subscription.updated`、`customer.subscription.deleted`。
8. 设置 `NEXT_PUBLIC_APP_URL` 为正式 origin。

如果部署包超过函数体积上限，改用自托管的 pack：把 [Sparticuz Chromium release](https://github.com/Sparticuz/chromium/releases) 里的 `chromium-v153.0.0-pack.tar` 放到你的存储，设置 `CHROMIUM_PACK_URL`。当前依赖的 `@sparticuz/chromium@153.0.0` 自带约 64MB 的 `chromium.br`，一般低于 250MB 的解压上限。

另一条路：同一套 Next 应用跑在带 Chrome 的虚拟机或容器上（`RENDER_DRIVER=chrome`）。Serverless 上不放浏览器。代码不必拆成第二个服务。

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
- `app/api/v1/billing/*` Stripe Checkout、Webhook，或 demo 结账
- `lib/render.ts` 选择 Chrome 或 Sparticuz
- `lib/store.ts` 文件 / 内存 / Upstash
