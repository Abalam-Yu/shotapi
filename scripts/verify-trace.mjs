import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

const routes = [
  ".next/server/app/api/v1/render/route.js.nft.json",
  ".next/server/app/api/v1/demo/render/route.js.nft.json",
  ".next/server/app/api/v1/health/route.js.nft.json",
];

const chromiumBins = ["chromium.br", "fonts.tar.br", "swiftshader.tar.br", "al2023.tar.br"];

function tracedFiles(nftPath) {
  const nft = JSON.parse(readFileSync(nftPath, "utf8"));
  const nftDir = path.dirname(nftPath);
  return nft.files.map((file) => path.normalize(path.resolve(nftDir, file)));
}

function isBrowserAsset(file) {
  return (
    file.includes(`${path.sep}playwright-core${path.sep}`) ||
    file.includes(`${path.sep}@sparticuz${path.sep}chromium${path.sep}`)
  );
}

function assertListed(files, owner, sibling, label) {
  if (!files.includes(path.normalize(sibling))) {
    throw new Error(`${label} is missing ${sibling} (needed by ${owner})`);
  }
}

function stageAndLoad(files) {
  const staging = mkdtempSync(path.join(tmpdir(), "shotapi-trace-"));
  try {
    for (const file of files) {
      if (!isBrowserAsset(file)) continue;
      const dest = path.join(staging, path.relative(process.cwd(), file));
      mkdirSync(path.dirname(dest), { recursive: true });
      copyFileSync(file, dest);
    }

    const cores = files
      .filter((file) => file.endsWith(`${path.sep}playwright-core${path.sep}lib${path.sep}coreBundle.js`))
      .map((file) => path.join(staging, path.relative(process.cwd(), file)));
    if (cores.length === 0) throw new Error("staged trace has no playwright-core lib/coreBundle.js");
    for (const core of cores) {
      const browsers = path.join(path.dirname(core), "..", "browsers.json");
      createRequire(core)(browsers);
    }

    const entries = files
      .filter((file) => file.endsWith(`${path.sep}@sparticuz${path.sep}chromium${path.sep}build${path.sep}index.js`))
      .map((file) => path.join(staging, path.relative(process.cwd(), file)));
    if (entries.length === 0) throw new Error("staged trace has no @sparticuz/chromium build/index.js");
    for (const entry of entries) {
      for (const name of chromiumBins) {
        const asset = path.join(path.dirname(entry), "..", "bin", name);
        if (!existsSync(asset)) throw new Error(`staged trace is missing ${asset}`);
      }
    }
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

for (const nftPath of routes) {
  const files = tracedFiles(nftPath);
  const cores = files.filter((file) => file.endsWith(`${path.sep}playwright-core${path.sep}lib${path.sep}coreBundle.js`));
  if (cores.length === 0) throw new Error(`${nftPath}: playwright-core lib/coreBundle.js is not traced`);
  for (const core of cores) {
    assertListed(files, core, path.join(path.dirname(core), "..", "browsers.json"), nftPath);
    assertListed(files, core, path.join(path.dirname(core), "..", "package.json"), nftPath);
  }

  const entries = files.filter((file) =>
    file.endsWith(`${path.sep}@sparticuz${path.sep}chromium${path.sep}build${path.sep}index.js`),
  );
  if (entries.length === 0) throw new Error(`${nftPath}: @sparticuz/chromium build/index.js is not traced`);
  for (const entry of entries) {
    for (const name of chromiumBins) {
      assertListed(files, entry, path.join(path.dirname(entry), "..", "bin", name), nftPath);
    }
  }

  stageAndLoad(files);
  console.log(`ok ${nftPath}`);
}

console.log("server trace includes playwright-core/browsers.json and the sparticuz pack");
