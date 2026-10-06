import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { pageAuth } from "@/server/auth/page";
import { fullName } from "@/lib/format";
import { PrintButton } from "@/components/print-button";
import { PageHeader } from "@/components/ui/page";

export const metadata = { title: "Member QR" };

export default async function MemberQr({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, tenant } = await pageAuth("members");
  const m = await db.member.findFirst({ where: { id, deletedAt: null } });
  if (!m) notFound();
  const svg = await QRCode.toString(m.qrToken, { type: "svg", margin: 1, width: 240, color: { dark: "#000000", light: "#ffffff" } });
  return (
    <div className="mx-auto max-w-sm text-center">
      <PageHeader title="Check-in QR" subtitle="Print or share this card. Scan it at reception to check in." />
      <div className="rounded-card border border-line bg-white p-6 text-black print:border-0">
        <p className="text-sm font-semibold">{tenant.name}</p>
        <div className="mx-auto my-3 w-fit" dangerouslySetInnerHTML={{ __html: svg }} aria-label={`QR code for ${fullName(m)}`} role="img" />
        <p className="text-lg font-bold">{fullName(m)}</p><p className="text-sm text-gray-600">{m.memberCode}</p>
      </div>
      <div className="mt-4"><PrintButton label="Print card" /></div>
    </div>
  );
}
