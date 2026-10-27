import { PRO_PRICE } from "./examples";

/** Public list prices read on this date. Competitor sites can change them. */
export const PRICE_CHECKED = "27 October 2026";

/** Urlbox publishes a machine-readable price file. That file's own generation date. */
export const URLBOX_PRICE_FILE_DATE = "26 October 2026";

export type ShotContext = {
  freeQuota: string;
  proQuota: string;
  proPrice: string;
};

/** Published defaults. A deployment can override the quotas with SHOTAPI_QUOTA_*. */
export const publishedShot: ShotContext = {
  freeQuota: "100",
  proQuota: "10,000",
  proPrice: PRO_PRICE,
};

export type CompareCell = string | ((ctx: ShotContext) => string);

export function resolveCell(value: CompareCell, ctx: ShotContext): string {
  return typeof value === "function" ? value(ctx) : value;
}

export type CompareRow = {
  id: string;
  feature: string;
  shot: CompareCell;
  other: string;
};

export type SourceLink = {
  label: string;
  href: string;
};

export type Competitor = {
  slug: "screenshotone" | "apiflash" | "urlbox";
  name: string;
  siteUrl: string;
  pricingUrl: string;
  title: string;
  description: string;
  lede: string;
  pickShot: string[];
  pickThem: string[];
  priceRows: CompareRow[];
  featureRows: CompareRow[];
  /** Competitor-side note at a similar volume. ShotAPI's own price is rendered from ShotContext. */
  volumeNote: string;
  sources: SourceLink[];
};

const shotFree: CompareCell = (ctx) =>
  `$0. ${ctx.freeQuota} successful renders per UTC month. No card and no account. Mint one with POST /api/v1/keys/free or the form on the homepage. The secret is shown once. Minting is rate-limited.`;

const shotPro: CompareCell = (ctx) =>
  `Pro is ${ctx.proPrice}/month for ${ctx.proQuota} successful renders, then POST /api/v1/render returns 402. No overage price and no annual price are published. Creem adds any tax at checkout.`;

const shotPastQuota: CompareCell = (ctx) =>
  `Hard stop. Past ${ctx.proQuota} successful renders in the UTC month, the key gets 402 quota_exceeded. Failed renders are not counted. There is no cache, so a repeat of the same URL counts again. A rendered error page, including a target that returns HTTP 404, counts.`;

export const competitors: Competitor[] = [
  {
    slug: "screenshotone",
    name: "ScreenshotOne",
    siteUrl: "https://screenshotone.com/",
    pricingUrl: "https://screenshotone.com/pricing",
    title: "ShotAPI vs ScreenshotOne",
    description:
      "ShotAPI Pro is $19 for 10,000 renders. ScreenshotOne Basic is $17 for 2,000 and Growth is $79 for 10,000. Public prices, feature gaps, and when to pick each.",
    lede:
      "Both turn a URL or HTML into an image or a PDF. ScreenshotOne also sells caching, storage, webhooks, blocking, video, and an MCP server. ShotAPI is the smaller API: PNG, JPEG, and PDF, with a free key and one paid plan.",
    pickShot: [
      "You need a PNG, JPEG, or PDF of a public URL, or of an HTML string you send in the request, and you will store the file yourself.",
      "You want a Free key without creating an account. The homepage form and POST /api/v1/keys/free return a demo key.",
      "Your month fits in the Pro quota, a hard stop at 402 is acceptable, and you do not need WebP, video, ad blocking, or a cache.",
      "You want one published price. Pro does not meter overage.",
    ],
    pickThem: [
      "You need cache hits that do not spend credits, S3 upload, webhooks, signed links, or Zapier and Make.",
      "You need ad and cookie-banner blocking, WebP, custom CSS or JavaScript, or cookies for a page behind a login.",
      "You need scrolling captures or video (Growth and Scale) or GPU rendering (Scale).",
      "About 2,000 screenshots a month is enough. Basic is $17, which is less than ShotAPI Pro, and it includes the feature set above.",
      "You want their dashboard, a published request-start limit, Paddle as the payment processor, and the 30-day refund on their pricing FAQ.",
    ],
    priceRows: [
      {
        id: "free",
        feature: "Free",
        shot: shotFree,
        other:
          "$0 for 100 screenshots a month, no card. Their pricing FAQ says this includes HTML and PDF, and the pricing page says you can try all features. It starts from their sign-up, not from an unauthenticated API call.",
      },
      {
        id: "entry",
        feature: "Paid entry",
        shot: shotPro,
        other:
          "Basic is $17/month for 2,000 credits, 40 request starts per minute, and $0.009 per extra screenshot if you turn extra usage on. Annual price on the same page is $170. List prices exclude VAT.",
      },
      {
        id: "ten-k",
        feature: "About 10,000 / month",
        shot: (ctx) =>
          `Pro is the only paid plan (${ctx.proPrice} for ${ctx.proQuota}). There is no second tier and no per-screenshot overage.`,
        other:
          "Growth is $79/month for 10,000 credits, 80 request starts per minute, and $0.006 per extra if enabled. Annual price is $790. Basic can also reach 10,000 only when extra usage is on: 8,000 extras at $0.009 is $72, so $89 on top of the $17 plan.",
      },
      {
        id: "higher",
        feature: "Higher volume",
        shot: "No published plan above Pro. The quota is the cap.",
        other:
          "Scale is $259/month for 50,000 credits, 150 request starts per minute, and $0.004 per extra if enabled. Annual price is $2,590. The plan adds GPU rendering and priority support. Extra-usage hard limits on the docs go up to 50,000 (Basic), 200,000 (Growth), and 1,000,000 (Scale).",
      },
    ],
    featureRows: [
      {
        id: "input",
        feature: "Input",
        shot: "A public http(s) URL, or an HTML document, exactly one of them. HTML defaults to a 500 KB cap.",
        other: "URL, HTML, or Markdown, as described in their product guide.",
      },
      {
        id: "webp",
        feature: "Image formats",
        shot: "No WebP. PNG and JPEG only. JPEG quality is 1–100. Viewport scale is 1–2, width 320–1920, height 240–4000.",
        other: "PNG, WebP, JPEG, and more, on the plans listed on their pricing page.",
      },
      {
        id: "pdf",
        feature: "PDF",
        shot: "Yes. format pdf returns application/pdf. Paper sizes are A4, Letter, and Legal, with landscape and print background.",
        other: "Yes. Their Basic plan lists PDF rendering from URL, HTML, or Markdown.",
      },
      {
        id: "full-page",
        feature: "Full page",
        shot: "Yes for PNG and JPEG (fullPage). PDF uses the paper size.",
        other: "Yes. Full-page screenshots are on the listed plans.",
      },
      {
        id: "ads",
        feature: "Ads and cookie banners",
        shot: "No ad blocking and no cookie-banner hiding.",
        other: "Yes. Block ads and cookie banners is on Basic, Growth, and Scale.",
      },
      {
        id: "css-js",
        feature: "Custom CSS, JS, element capture",
        shot: "No custom CSS, no injected JavaScript, and no element selector.",
        other:
          "Their product guide describes custom CSS and JavaScript, hiding elements, and capturing a selected element. Confirm the option you need in their docs.",
      },
      {
        id: "cookies",
        feature: "Logged-in pages",
        shot: "No. Cookies and custom headers are not forwarded. Login pages are not supported.",
        other:
          "Supported with cookies or authentication headers you supply. The hosted MCP tools are documented as public URLs only.",
      },
      {
        id: "cache",
        feature: "Cache",
        shot: "No screenshot cache. Every successful render counts, including a repeat of the same URL.",
        other:
          "Yes. Cached responses do not use a credit. A cache miss can render again and count. Their docs describe caching for up to one month.",
      },
      {
        id: "delivery",
        feature: "Delivery",
        shot: "The file bytes come back on the HTTP response, with content-disposition. ShotAPI does not host a shareable image URL, upload to S3, or send a render webhook.",
        other:
          "Response body, asynchronous rendering with webhooks, S3-compatible upload, and signed links. SDKs include JavaScript, Python, Go, Java, PHP, Ruby, and C#. No-code includes Zapier, Make, and n8n. Hosted MCP is listed.",
      },
      {
        id: "size",
        feature: "Response size and timeout",
        shot: "Response bodies stop at 4.5 MB (413). Default render timeout is 25 seconds. The route maxDuration is 60 seconds.",
        other: "Use their docs for the current timeout. This page does not restate a number we did not read on a primary page.",
      },
      {
        id: "rate",
        feature: "Request rate",
        shot: "No published per-minute render cap. The documented cap is the monthly quota. That is not a throughput promise: the service is best-effort, with no uptime SLA.",
        other:
          "Request starts per minute: 40 on Basic, 80 on Growth, 150 on Scale. A finished render does not give the slot back inside that minute.",
      },
      {
        id: "video",
        feature: "Video",
        shot: "No video, GIF, or scrolling capture.",
        other: "Scrolling screenshots and video generation are on Growth and Scale. GPU rendering is on Scale.",
      },
      {
        id: "proxy",
        feature: "Proxy and stealth",
        shot: "No stealth mode, no proxy product, and no country selector. Private and localhost URLs are blocked unless the operator sets ALLOW_PRIVATE_URLS=1.",
        other:
          "Stealth mode is listed on the paid plans. Their own note says they do not specialize in bypassing protections. Choosing an IP location is on Growth and Scale.",
      },
      {
        id: "billing",
        feature: "Who charges the card",
        shot: "Creem is the merchant of record for live Pro checkout. ShotAPI does not store card numbers. Stripe on this codebase is a sandbox path. Paddle checkout is not available.",
        other: "Paddle, according to their pricing FAQ. They also list wire transfer on annual billing, with a $100 minimum.",
      },
      {
        id: "refund",
        feature: "Published refund",
        shot: "Narrower. Email within 14 days for a duplicate charge, a charge after a confirmed cancellation, an outage on our side we cannot fix, or where the law requires it. Stopping use mid-period is not itself a refund. Details are on the refund page.",
        other:
          "Their pricing FAQ says: if you are disappointed, email support@screenshotone.com within 30 days and they refund in full.",
      },
      {
        id: "sla",
        feature: "Uptime",
        shot: "No uptime SLA. The terms call the API best-effort.",
        other: "No uptime percentage was stated on the pricing page we read. Scale lists priority support.",
      },
    ],
    volumeNote:
      "ScreenshotOne Growth is $79/month for 10,000 credits. Basic is $17/month for 2,000. Extra usage is off unless you enable it. Prices on their page exclude VAT. Annual list prices are $170, $790, and $2,590.",
    sources: [
      { label: "ScreenshotOne pricing", href: "https://screenshotone.com/pricing" },
      { label: "ScreenshotOne product guide for AI tools", href: "https://screenshotone.com/ai-information/" },
      { label: "How credits work", href: "https://screenshotone.com/docs/credits/" },
      { label: "Extra usage limits", href: "https://screenshotone.com/docs/charging-extra/" },
      { label: "ShotAPI terms", href: "/legal/terms" },
      { label: "ShotAPI refunds", href: "/legal/refund" },
    ],
  },
  {
    slug: "apiflash",
    name: "ApiFlash",
    siteUrl: "https://apiflash.com/",
    pricingUrl: "https://apiflash.com/#pricing",
    title: "ShotAPI vs ApiFlash",
    description:
      "ShotAPI Pro is $19 for 10,000 PNG, JPEG, or PDF renders. ApiFlash lists $7 for 1,000 and $35 for 10,000 screenshots, with WebP, ad blocking, and caching. No PDF in their format list.",
    lede:
      "ApiFlash is a URL-to-image API on Chrome. Its public plans are cheaper at 1,000 screenshots and include blocking, caching, and S3. ShotAPI adds PDF and raw HTML input, and its 10,000-render plan has a lower list price than ApiFlash Medium. The products stop matching once you need those extras.",
    pickShot: [
      "You need a PDF, or you need to POST an HTML document rather than a URL.",
      "You want a Free key with no account, then one Pro plan at the price in the table, and you do not need WebP or ad blocking.",
      "You are fine storing the bytes yourself. ShotAPI does not upload to your bucket.",
    ],
    pickThem: [
      "You need URL screenshots in PNG, JPEG, or WebP, with full-page capture, a CSS element, ad blocking, or cookie-banner hiding.",
      "1,000 screenshots is the volume you will pay for. Lite is $7. ShotAPI has no paid tier between the free quota and Pro.",
      "You want identical calls to hit a cache and not count. Their default ttl is 86,400 seconds (one day).",
      "You need the rate in their docs: 20 requests per second, burst 400, then HTTP 429.",
      "You need cookies, custom headers, injected CSS or JavaScript, or your own proxy. Managed proxies and IP geolocation are on the custom enterprise plan.",
    ],
    priceRows: [
      {
        id: "free",
        feature: "Free",
        shot: shotFree,
        other:
          "$0 for 100 screenshots. The card lists PNG, JPEG, WebP, full page, mobile screenshots, block ads, hide cookie banners, and export to S3. The button goes to their register page. We did not see a statement that the free plan requires a card.",
      },
      {
        id: "entry",
        feature: "Paid entry",
        shot: shotPro,
        other:
          "Lite is $7/month for 1,000 screenshots, with the same capture features as the free card, plus basic support. There is no cheaper ShotAPI paid plan to set next to this.",
      },
      {
        id: "ten-k",
        feature: "About 10,000 / month",
        shot: (ctx) => `Pro covers ${ctx.proQuota} successful renders for ${ctx.proPrice}, then stops.`,
        other:
          "Medium is $35/month for 10,000 screenshots, with priority support. The feature list on the card matches Lite: PNG, JPEG, WebP, full page, mobile, ad blocking, cookie banners, and S3.",
      },
      {
        id: "higher",
        feature: "Higher volume",
        shot: "No published plan above Pro.",
        other:
          "Large is $180/month for 100,000 screenshots and premium support. Custom enterprise is a quoted volume, all Large features, top-priority support, managed proxies, and IP geolocation. The homepage does not list an overage rate.",
      },
    ],
    featureRows: [
      {
        id: "input",
        feature: "Input",
        shot: "A public URL or an HTML document.",
        other:
          "A URL. The documented required parameters are access_key and url. We did not find an HTML-document input. You can inject CSS and JavaScript into the loaded page.",
      },
      {
        id: "webp",
        feature: "Image formats",
        shot: "No WebP. PNG and JPEG only.",
        other:
          "jpeg, png, or webp. The format parameter says WebP is limited to 16,350 pixels on a side after scale. Default format is jpeg. Quality applies to jpeg and webp. scale_factor is 1 or 2.",
      },
      {
        id: "pdf",
        feature: "PDF",
        shot: "Yes. PNG, JPEG, and PDF are the same render route.",
        other:
          "Not in the format parameter. The docs we read allow jpeg, png, or webp only. Do not buy ApiFlash for PDF based on this page.",
      },
      {
        id: "full-page",
        feature: "Full page and element",
        shot: "Full page for PNG and JPEG. No element selector and no scroll-before-capture flag.",
        other:
          "full_page, scroll_page, and element (a CSS selector). Viewport width and height go up to 16,350 pixels when the product of the two stays within their documented pixel cap.",
      },
      {
        id: "ads",
        feature: "Ads and cookie banners",
        shot: "No ad blocking and no cookie-banner hiding.",
        other: "no_ads, no_cookie_banners, and no_tracking are documented parameters, including on the free plan card.",
      },
      {
        id: "css-js",
        feature: "CSS and JavaScript",
        shot: "No injected CSS or JavaScript parameter.",
        other: "css and js parameters. Both are URL-encoded strings applied to the page.",
      },
      {
        id: "cookies",
        feature: "Logged-in pages",
        shot: "No. Cookies and custom headers are not forwarded.",
        other: "cookies and headers parameters are documented. A user_agent and Accept-Language are also documented.",
      },
      {
        id: "cache",
        feature: "Cache",
        shot: "No screenshot cache. Every successful render counts, including repeats.",
        other:
          "ttl defaults to 86,400 seconds. Same parameters return a cached screenshot and do not count toward the monthly quota. fresh forces a new capture. ttl can be 0 through 30 days.",
      },
      {
        id: "delivery",
        feature: "Delivery",
        shot: "Image or PDF bytes on the response. No S3 upload and no JSON URL mode.",
        other:
          "response_type image returns the bytes. response_type json returns links. S3 and S3-compatible upload parameters are documented. Code samples exist for cURL, C#, Go, Java, Node, PHP, Python, and Ruby.",
      },
      {
        id: "size",
        feature: "Timeout",
        shot: "Default render timeout is 25 seconds. Response bodies stop at 4.5 MB.",
        other:
          "wait_until_timeout defaults to 30 seconds, with a documented maximum of 30. delay is up to 10 seconds. Their docs prefer wait_for or wait_until over delay.",
      },
      {
        id: "rate",
        feature: "Request rate",
        shot: "No published per-minute render cap, and no throughput promise. The monthly quota is the documented limit.",
        other:
          "Leaky bucket: 20 requests per second and a burst of 400. Past the burst, further calls return 429. This is a real reason to pick ApiFlash when you need sustained rate.",
      },
      {
        id: "video",
        feature: "Video",
        shot: "No video, GIF, or scrolling capture.",
        other: "Not listed as a video product. scroll_page scrolls the page before a still screenshot.",
      },
      {
        id: "proxy",
        feature: "Proxy and location",
        shot: "No proxy product and no country selector.",
        other:
          "proxy takes your own proxy address. ip_location is documented as custom enterprise only. Latitude, longitude, and time zone emulation are separate parameters.",
      },
      {
        id: "billing",
        feature: "Who charges the card",
        shot: "Creem is the merchant of record. Tax, if any, is added at checkout. ShotAPI does not store the card.",
        other:
          "The terms are with NETCUBE, an EURL in Saint-Gély-du-Fesc, France. Their terms say you provide card details to NETCUBE. We did not see a processor name on the pricing cards.",
      },
      {
        id: "refund",
        feature: "Published refund",
        shot: "14 days, and only for the cases on the refund page: duplicate or post-cancellation charges, an outage on our side, or where the law requires a refund.",
        other:
          "Their terms of service say subscription plan fee payments shall be strictly non-refundable. Read that clause before you rely on a cooling-off period.",
      },
      {
        id: "sla",
        feature: "Uptime",
        shot: "No uptime SLA.",
        other: "No uptime percentage on the pricing cards we read. Support level rises with the plan (basic, priority, premium, then top priority on enterprise).",
      },
    ],
    volumeNote:
      "ApiFlash Medium is $35/month for 10,000 screenshots. Lite is $7/month for 1,000. Large is $180/month for 100,000. Those cards do not mention PDF.",
    sources: [
      { label: "ApiFlash homepage pricing", href: "https://apiflash.com/#pricing" },
      { label: "ApiFlash documentation", href: "https://apiflash.com/documentation" },
      { label: "ApiFlash terms of service", href: "https://apiflash.com/terms_of_service" },
      { label: "ApiFlash legal notice (NETCUBE)", href: "https://apiflash.com/legal_notice" },
      { label: "ShotAPI terms", href: "/legal/terms" },
      { label: "ShotAPI refunds", href: "/legal/refund" },
    ],
  },
  {
    slug: "urlbox",
    name: "Urlbox",
    siteUrl: "https://urlbox.com/",
    pricingUrl: "https://urlbox.com/pricing",
    title: "ShotAPI vs Urlbox",
    description:
      "ShotAPI Pro is $19 for 10,000 simple renders and a free 100. Urlbox Lo-Fi is $19 for about 2,000, Hi-Fi starts at $49, and their price file lists $67 to $99 at 10,000 renders. No ongoing free API quota.",
    lede:
      "Urlbox is the older, wider screenshot API: more formats, stealth and proxy options, storage, video, and an SLA on Business. ShotAPI is a single render route with a free monthly quota and a lower published price at 10,000 plain renders. The $19 stickers are not the same product.",
    pickShot: [
      "You want 100 free renders every UTC month, with no trial expiry and no account.",
      "You need PNG, JPEG, or PDF of public pages or HTML you supply, at the Pro quota in the table, and you do not need stealth or video.",
      "A hard monthly cap is what you want. Urlbox's FAQ says they auto-upgrade you when you pass a quota. ShotAPI returns 402.",
    ],
    pickThem: [
      "You need sites that block bots, stealth, or managed proxies. Urlbox puts that class of capture on Ultra and above, not on the cheapest plan.",
      "You need WebP, AVIF, video, Markdown or HTML extraction, async renders, webhooks, or S3.",
      "You need an uptime SLA. Their pricing notes list 99.95% on Business and 99.99% on Enterprise.",
      "You will outgrow 10,000 renders. Their price file has volume steps through 1,000,000 renders a month.",
      "You want a 7-day trial without a card, their $100 / 10,000-screenshot guarantee, and the 30-day money-back note in that price file.",
    ],
    priceRows: [
      {
        id: "free",
        feature: "Free",
        shot: shotFree,
        other:
          "No ongoing free API quota. Their pricing FAQ explains why they do not offer a free plan. The price file dated 26 October 2026 lists a 7-day trial with no card on Hi-Fi and Ultra, and a 3-month trial on application for Business. CaptureDeck, their separate no-code product, is not this API.",
      },
      {
        id: "entry",
        feature: "Paid entry",
        shot: shotPro,
        other:
          "Lo-Fi is $19/month on the pricing page for up to 2,000 renders, 30 requests per minute. The same page describes it as thumbnails and screenshots of sites you own, and low quality on third-party sites. The feature matrix says third-party screenshots on Lo-Fi are thumbnails only. Annual Lo-Fi is described as just over $4/month. Prices exclude VAT.",
      },
      {
        id: "ten-k",
        feature: "About 10,000 / month",
        shot: (ctx) =>
          `One plan: ${ctx.proPrice} for ${ctx.proQuota} successful renders. The same render options as the free key.`,
        other:
          "Their price file (generated 26 October 2026) lists Hi-Fi at $67 and Ultra at $99 for 10,000 monthly renders. Ultra's floor is $99. Hi-Fi's sticker at 5,000 renders is $49. Business at 10,000 renders is listed at $525, from $495 base plus $3 per 1,000 renders. The pricing page also shows $498 beside that formula, which matches the base plus the first 1,000.",
      },
      {
        id: "higher",
        feature: "Higher volume",
        shot: "No published plan above Pro, and no automatic upgrade.",
        other:
          "The same file lists higher steps, for example Hi-Fi $240 and Ultra $280 at 50,000 renders, and Enterprise from $3,000/month on the pricing page for custom clusters. Going over a quota does not cut the service off. They move you to the next volume price. Cached Render Link hits do not count. REST API renders do.",
      },
    ],
    featureRows: [
      {
        id: "input",
        feature: "Input",
        shot: "A public URL or an HTML document. SVG as a source is not a parameter.",
        other:
          "URL, HTML, and SVG are on their pricing matrix. Markdown extraction is an output, not the only input.",
      },
      {
        id: "webp",
        feature: "Image formats",
        shot: "No WebP, AVIF, or SVG output. PNG and JPEG only.",
        other:
          "Their price file lists PNG, JPEG, WEBP, AVIF, MP4, WEBM, PDF, SVG, Markdown, JSON, and HTML. Which of those a plan includes is on the pricing matrix. 4K and 5K retina are plan-gated there.",
      },
      {
        id: "pdf",
        feature: "PDF",
        shot: "Yes, on the free key and on Pro. A4, Letter, or Legal.",
        other: "URL to PDF and HTML to PDF are rows on their pricing matrix.",
      },
      {
        id: "full-page",
        feature: "Full page, ads, elements",
        shot: "Full page for images. No ad blocking, no cookie-banner hiding, and no element capture.",
        other: "Full page, block ads and cookie banners, and element screenshots are on the matrix. Check the plan column before you assume Lo-Fi includes a row.",
      },
      {
        id: "ads",
        feature: "Ads and cookie banners",
        shot: "No ad blocking and no cookie-banner hiding.",
        other: "Listed on the pricing matrix. Availability still depends on the plan column.",
      },
      {
        id: "css-js",
        feature: "Custom CSS and JavaScript",
        shot: "No injected CSS or JavaScript.",
        other: "Custom headers and custom JavaScript are matrix rows, plan-gated. Hi-Fi and above is where several automation rows start.",
      },
      {
        id: "cookies",
        feature: "Logged-in pages",
        shot: "No. Cookies are not forwarded.",
        other: "Custom headers are on the matrix for higher plans. Confirm cookie support in their current docs for the plan you buy.",
      },
      {
        id: "cache",
        feature: "Cache",
        shot: "No screenshot cache. Every successful render counts, including repeats.",
        other:
          "Render Links are cached 30 days and those hits do not count. REST API renders count. ttl and force can override the cache. Failed renders are not charged.",
      },
      {
        id: "delivery",
        feature: "Delivery",
        shot: "Bytes on the synchronous response only. No webhook, no S3, no async job id.",
        other:
          "Synchronous and async APIs. S3 from Hi-Fi, any S3-compatible store from Ultra. Webhooks and Zapier from Hi-Fi upward in their trial table. SDKs and a CLI are documented. File size limits on the matrix run from 2.5 MB on Lo-Fi to 10 MB on Hi-Fi, then no limit on Ultra and above. Extra size and long renders can consume more than one render credit. Read the footnote on their pricing page.",
      },
      {
        id: "size",
        feature: "Timeout",
        shot: "Default timeout 25 seconds. Hard response cap 4.5 MB, including on Pro.",
        other:
          "The pricing matrix lists request timeouts of 30 seconds (Lo-Fi), 90 seconds (Hi-Fi), and 300 seconds (Ultra and Business).",
      },
      {
        id: "rate",
        feature: "Request rate",
        shot: "No published per-minute cap and no SLA. Monthly quota only.",
        other:
          "30 requests per minute on Lo-Fi, 60 on Hi-Fi, 250 on Ultra, and 1,000 on Business in the pricing matrix. The price file's trial table lists Business at 500 requests per minute. Those two Urlbox pages disagree. Use the live pricing page for the plan you buy.",
      },
      {
        id: "video",
        feature: "Video",
        shot: "No video, GIF, or scrolling capture.",
        other: "Video, animated screenshots, and scrolling screenshots are matrix rows and are not on every plan.",
      },
      {
        id: "proxy",
        feature: "Proxy and stealth",
        shot: "No stealth mode and no proxy product. Third-party public pages use the same renderer as pages you own. Bot walls will fail.",
        other:
          "The matrix rates external privacy as none (Lo-Fi), anonymous (Hi-Fi), and stealth (Ultra and above). Third-party sites are thumbnails only on Lo-Fi, most on Hi-Fi, and all on Ultra. Managed proxies have multipliers, up to the footnote on the pricing page. Ultra is the plan they describe for pages that block bots.",
      },
      {
        id: "billing",
        feature: "Who charges the card",
        shot: "Creem is the merchant of record for Pro. The operator is an individual seller, and the terms use the law of the People's Republic of China.",
        other:
          "Urlbox Ltd, Leeds, England. Their terms use the law of England and Wales. The pricing FAQ says Stripe handles the card and Urlbox does not store it.",
      },
      {
        id: "refund",
        feature: "Published refund",
        shot: "See the refund page. A paid period is not refunded only because you stopped calling the API. Ask within 14 days for the listed cases.",
        other:
          "The price file lists a 30-day money-back guarantee and a refund of up to $100 if you are not happy with the first 10,000 screenshots. Cancel from their dashboard. Access runs to the renewal date.",
      },
      {
        id: "sla",
        feature: "Uptime",
        shot: "No uptime SLA.",
        other: "99.95% on Business and 99.99% on Enterprise, as listed on the pricing matrix. Lower plans do not show an SLA in that table.",
      },
    ],
    volumeNote:
      "At 10,000 renders, Urlbox's price file lists Hi-Fi at $67/month and Ultra at $99/month. Lo-Fi's monthly sticker is $19 for about 2,000 renders of sites you own, with third-party captures limited. Prices exclude VAT.",
    sources: [
      { label: "Urlbox pricing page", href: "https://urlbox.com/pricing" },
      {
        label: "Urlbox pricing.md (generated 26 October 2026)",
        href: "https://urlbox.com/pricing.md",
      },
      { label: "Urlbox terms (Urlbox Ltd)", href: "https://urlbox.com/policies/terms" },
      { label: "ShotAPI terms", href: "/legal/terms" },
      { label: "ShotAPI refunds", href: "/legal/refund" },
    ],
  },
];

export function getCompetitor(slug: string): Competitor | undefined {
  return competitors.find((item) => item.slug === slug);
}

export const compareIndex = {
  title: "ShotAPI vs ScreenshotOne, ApiFlash, and Urlbox",
  description:
    "Public list prices for ShotAPI, ScreenshotOne, ApiFlash, and Urlbox, checked 27 October 2026. What each paid plan includes, and when the lower price is the wrong API.",
  lede:
    "These pages compare published prices and documented features. They are ShotAPI's notes for an English-reading buyer. They are not a review sponsored by the other APIs, and they are not a promise that those prices stay put.",
};
