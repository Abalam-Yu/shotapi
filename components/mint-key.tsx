"use client";

import { useRef, useState, type FormEvent } from "react";

type Minted = {
  key: string;
  prefix: string;
  name: string;
  plan: string;
  tier: string;
  limit: number;
};

export function MintKey({ origin, limit }: { origin: string; limit: number }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [minted, setMinted] = useState<Minted | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"key" | "curl" | null>(null);
  const lock = useRef(false);

  const curl = minted
    ? `curl -sS -X POST ${origin}/api/v1/render \\\n  -H "authorization: Bearer ${minted.key}" \\\n  -H "content-type: application/json" \\\n  -o shot.png \\\n  -d '{"url":"https://example.com","format":"png"}'`
    : "";

  async function copy(value: string, which: "key" | "curl") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setError(null);
    } catch {
      setError("Clipboard is blocked. Select the key and copy it.");
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/keys/free", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(name.trim() ? { name: name.trim() } : {}),
          ...(email.trim() ? { email: email.trim() } : {}),
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        key?: string;
        prefix?: string;
        name?: string;
        plan?: string;
        tier?: string;
        limit?: number;
        error?: { message?: string };
      } | null;
      if (!response.ok || !data?.key) {
        lock.current = false;
        setError(data?.error?.message ?? `Request failed (${response.status})`);
        setPending(false);
        return;
      }
      setMinted({
        key: data.key,
        prefix: data.prefix ?? data.key.slice(0, 16),
        name: data.name ?? "Free key",
        plan: data.plan ?? "demo",
        tier: data.tier ?? "free",
        limit: data.limit ?? limit,
      });
      setPending(false);
    } catch {
      lock.current = false;
      setError("The mint request did not finish. Try again.");
      setPending(false);
    }
  }

  if (minted) {
    return (
      <div className="panel mint-result">
        <h3>Copy this Free key now</h3>
        <p>
          This is the only time the full secret is shown. We store a hash of it, under the name{" "}
          <code>{minted.name}</code>. The plan is <code>{minted.plan}</code> ({minted.tier}), with{" "}
          {minted.limit.toLocaleString("en-US")} renders per UTC month. Prefix <code>{minted.prefix}</code>.
        </p>
        <p className="mint-secret" tabIndex={0} aria-label="Free API key">
          {minted.key}
        </p>
        <div className="actions">
          <button type="button" onClick={() => copy(minted.key, "key")}>
            {copied === "key" ? "Copied" : "Copy key"}
          </button>
          <button type="button" className="secondary" onClick={() => copy(curl, "curl")}>
            {copied === "curl" ? "Copied" : "Copy curl"}
          </button>
        </div>
        <pre className="mint-curl">
          <code>{curl}</code>
        </pre>
        {error ? (
          <p className="status error" role="status">
            {error}
          </p>
        ) : (
          <p className="status" role="status">
            Leave this page and the secret is gone. Mint is rate limited if you need another one.
          </p>
        )}
      </div>
    );
  }

  return (
    <form className="mint panel" onSubmit={onSubmit} aria-busy={pending}>
      <label htmlFor="free-key-name">Name (optional)</label>
      <input
        id="free-key-name"
        name="name"
        maxLength={80}
        autoComplete="off"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <label htmlFor="free-key-email">Email (optional, limits repeat mints)</label>
      <input
        id="free-key-email"
        name="email"
        type="email"
        inputMode="email"
        maxLength={120}
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <button type="submit" disabled={pending}>
        {pending ? "Minting…" : "Mint free key"}
      </button>
      <p className={error ? "status error" : "status"} role="status">
        {error ??
          `Free keys can call the render API ${limit.toLocaleString("en-US")} times this month. No account and no admin token.`}
      </p>
    </form>
  );
}
