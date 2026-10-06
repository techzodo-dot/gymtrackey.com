import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingFooter, MarketingNav } from "@/components/marketing/nav";
import { prisma } from "@/server/db/prisma";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.blogPost.findFirst({ where: { slug, published: true } }).catch(() => null);
  return p ? { title: p.seoTitle ?? p.title, description: p.seoDesc ?? p.excerpt ?? undefined, openGraph: { title: p.seoTitle ?? p.title, type: "article", images: p.featuredImg ? [p.featuredImg] : undefined } } : {};
}

export default async function Post({ params }: P) {
  const { slug } = await params;
  const p = await prisma.blogPost.findFirst({ where: { slug, published: true } });
  if (!p) notFound();
  const ld = { "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, datePublished: p.publishedAt, dateModified: p.updatedAt, description: p.excerpt, author: { "@type": "Organization", name: "GymTrackey" } };
  return (
    <>
      <MarketingNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <article className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-xs text-muted">{p.category} · {fmtDate(p.publishedAt)}</p><h1 className="mt-1 text-4xl font-black">{p.title}</h1>
        <div className="mt-8 space-y-4 leading-relaxed text-muted">{p.body.split(/\n\s*\n/).map((para, i) => <p key={i}>{para}</p>)}</div>
      </article>
      <MarketingFooter />
    </>
  );
}
