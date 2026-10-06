import Link from "next/link";
import { pageAuth } from "@/server/auth/page";
import { can } from "@/server/auth/permissions";
import { NAV } from "@/components/dashboard/shell";
import { PageHeader } from "@/components/ui/page";

export const metadata = { title: "More" };

export default async function More() {
  const { user } = await pageAuth();
  const items = NAV.filter((i) => !i.perm || can(user.role, user.permissions, i.perm));
  return <div><PageHeader title="More" /><ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">{items.map((i) => <li key={i.href}><Link href={i.href} className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 text-sm font-semibold hover:bg-surface2"><i.icon size={20} aria-hidden />{i.label}</Link></li>)}</ul></div>;
}
