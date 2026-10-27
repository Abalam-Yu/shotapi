import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="topbar">
      <Link className="brand" href="/">
        <span className="mark" aria-hidden="true">S</span>
        ShotAPI
      </Link>
      <nav aria-label="Primary">
        <Link href="/#free-key">Free key</Link>
        <Link href="/#pricing">Pricing</Link>
        <Link href="/docs">Docs</Link>
        <a href="https://github.com/Abalam-Yu/shotapi">GitHub</a>
      </nav>
    </header>
  );
}
