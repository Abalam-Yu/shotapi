import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CompareArticle } from "@/components/compare-article";
import { competitors, getCompetitor } from "@/lib/compare";
import { config } from "@/lib/config";
import { PRO_PRICE } from "@/lib/examples";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return competitors.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = getCompetitor(slug);
  if (!item) return { title: "Comparison" };
  return {
    title: item.title,
    description: item.description,
    alternates: { canonical: `/compare/${item.slug}` },
  };
}

export default async function CompareSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = getCompetitor(slug);
  if (!item) notFound();

  return (
    <CompareArticle
      item={item}
      ctx={{
        freeQuota: config.quotaDemo().toLocaleString("en-US"),
        proQuota: config.quotaPro().toLocaleString("en-US"),
        proPrice: PRO_PRICE,
      }}
    />
  );
}
