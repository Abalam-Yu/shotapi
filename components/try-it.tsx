"use client";

import { useState, type FormEvent } from "react";

const DEFAULT_HTML = `<!doctype html>
<html>
  <body style="margin:0;background:#f3efe7;color:#1c1916;font-family:Georgia,serif">
    <div style="padding:48px">
      <p style="letter-spacing:.18em;font-size:12px">SHOTAPI</p>
      <h1 style="font-weight:500;font-size:48px;margin:8px 0">Hello from HTML.</h1>
      <p>This image was rendered in the browser you are running.</p>
    </div>
  </body>
</html>`;

type Format = "png" | "jpeg" | "pdf";

export function TryIt() {
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [format, setFormat] = useState<Format>("png");
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<string | null>(null);

  function replaceUrl(current: string | null, next: string | null) {
    if (current) URL.revokeObjectURL(current);
    return next;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const response = await fetch("/api/v1/demo/render", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        html,
        format,
        viewport: { width: 960, height: 540 },
      }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      setError(data?.error?.message ?? `Request failed (${response.status})`);
      setPending(false);
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const used = response.headers.get("x-shotapi-usage");
    const limit = response.headers.get("x-shotapi-limit");
    setUsage(used && limit ? `${used} / ${limit} renders this month` : null);
    if (format === "pdf") {
      setPdfUrl((current) => replaceUrl(current, url));
      setPreview((current) => replaceUrl(current, null));
    } else {
      setPreview((current) => replaceUrl(current, url));
      setPdfUrl((current) => replaceUrl(current, null));
    }
    setPending(false);
  }

  return (
    <form className="try" onSubmit={onSubmit} aria-busy={pending}>
      <div className="panel">
        <label htmlFor="html">HTML</label>
        <textarea
          id="html"
          value={html}
          spellCheck={false}
          onChange={(event) => setHtml(event.target.value)}
        />
        <label htmlFor="format">
          Format
          <select id="format" value={format} onChange={(event) => setFormat(event.target.value as Format)}>
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="pdf">PDF</option>
          </select>
        </label>
        <button type="submit" disabled={pending}>
          {pending ? "Rendering…" : "Render snippet"}
        </button>
        <p className={error ? "status error" : "status"} role="status">
          {error ?? usage ?? "The preview calls the demo endpoint. It accepts HTML only."}
        </p>
      </div>
      <div className="preview">
        {preview ? (
          // Blob URLs from the render response are not a next/image source.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Rendered preview of the HTML snippet" />
        ) : pdfUrl ? (
          <p>
            PDF is ready. <a href={pdfUrl} download="shot.pdf">Download shot.pdf</a>
          </p>
        ) : (
          <p>The render will show up here.</p>
        )}
      </div>
    </form>
  );
}
