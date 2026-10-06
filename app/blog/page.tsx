import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter, MarketingNav } from "@/components/marketing/nav";
import { prisma } from "@/server/db/prisma";
import { fmtDate } from "@/lib/format";

export const metadata: Metadata = { title: "Blog — Gym management tips", description: "Guides on gym membership management, fee tracking, reducing churn and growing your fitness business." };
export const dynamic = "force-dynamic";

export default async function Blog() {
  const posts = await prisma.blogPost.findMany({ where: { published: true }, orderBy: { publishedAt: "desc" } }).catch(() => []);
  return (
    <>
      <MarketingNav />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-4xl font-black">The GymTrackey blog</h1>
        <p className="mt-2 text-muted">Practical guides for gym owners.</p>
        <div className="mt-10 space-y-6">
          {posts.length === 0 && <p className="text-muted">No posts yet — check back soon.</p>}
          {posts.map((p) => <article key={p.id} className="rounded-card border border-line bg-surface p-6"><p className="text-xs text-muted">{p.category} · {fmtDate(p.publishedAt)}</p><h2 className="mt-1 text-xl font-bold"><Link href={`/blog/${p.slug}`} className="hover:text-brand">{p.title}</Link></h2>{p.excerpt && <p className="mt-2 text-sm text-muted">{p.excerpt}</p>}</article>)}
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
