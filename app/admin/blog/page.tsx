import { prisma } from "@/server/db/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormGrid, Input, Textarea } from "@/components/ui/form";
import { Flash, PageHeader, StatusBadge, TableWrap, Td, Th } from "@/components/ui/page";
import { fmtDate } from "@/lib/format";
import { savePostAction } from "../actions";

export const metadata = { title: "Blog · Admin" };

export default async function AdminBlog({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const posts = await prisma.blogPost.findMany({ orderBy: { updatedAt: "desc" } });
  return (
    <>
      <PageHeader title="Blog" subtitle="Posting an existing slug updates that post." /><Flash ok={sp.ok} error={sp.error} />
      {posts.length > 0 && <TableWrap><thead><tr><Th>Title</Th><Th>Slug</Th><Th>Category</Th><Th>Updated</Th><Th>Status</Th></tr></thead><tbody>{posts.map((p) => <tr key={p.id}><Td>{p.title}</Td><Td className="font-mono text-xs">{p.slug}</Td><Td>{p.category ?? "—"}</Td><Td>{fmtDate(p.updatedAt)}</Td><Td><StatusBadge status={p.published ? "ACTIVE" : "PENDING"} /></Td></tr>)}</tbody></TableWrap>}
      <Card className="mt-6 max-w-3xl"><h2 className="mb-4 text-lg font-bold">Create / update post</h2><form action={savePostAction} className="space-y-4"><FormGrid>
        <Input label="Title *" name="title" required /><Input label="Slug *" name="slug" required placeholder="best-gym-management-software-india" /><Input label="Category" name="category" /><Input label="Tags (comma separated)" name="tags" />
        <Input label="SEO title" name="seoTitle" /><Input label="Featured image URL" name="featuredImg" type="url" /></FormGrid><Input label="SEO description" name="seoDesc" /><Textarea label="Excerpt" name="excerpt" /><Textarea label="Body * (blank line = new paragraph)" name="body" rows={10} required />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" className="accent-[var(--brand-to)]" />Publish</label><Button type="submit">Save post</Button></form></Card>
    </>
  );
}
