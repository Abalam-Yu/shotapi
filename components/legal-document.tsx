import type { ReactNode } from "react";

import { config } from "@/lib/config";

export function LegalDocument({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const email = config.supportEmail();
  return (
    <article className="section legal">
      <p className="eyebrow">Legal</p>
      <h1>{title}</h1>
      <p className="lede">
        {description} Last updated 22 October 2026. Operator: 禧柱 于 (Abalam-Yu). Contact{" "}
        <a href={`mailto:${email}`}>{email}</a>.
      </p>
      {children}
    </article>
  );
}
