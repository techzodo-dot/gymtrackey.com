import { pageAuth } from "@/server/auth/page";
import { ImportMembers } from "@/components/dashboard/import-members";
import { PageHeader } from "@/components/ui/page";

export const metadata = { title: "Import members" };

export default async function ImportPage() {
  await pageAuth("members");
  return <div className="max-w-2xl"><PageHeader title="Import members" subtitle="Bring your existing members from a spreadsheet." /><ImportMembers /></div>;
}
