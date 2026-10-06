import { adminPage } from "@/server/auth/admin";
import { AdminShell } from "@/components/admin/shell";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await adminPage();
  const [leads, tickets] = await Promise.all([prisma.lead.count({ where: { status: "NEW" } }), prisma.supportTicket.count({ where: { status: "OPEN" } })]);
  return <AdminShell badges={{ "/admin/leads": leads, "/admin/tickets": tickets }}>{children}</AdminShell>;
}
