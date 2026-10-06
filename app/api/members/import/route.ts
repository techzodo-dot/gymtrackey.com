import { assertSameOrigin, fail, handleError, json } from "@/server/api";
import { requirePermission } from "@/server/auth/guard";
import { assertMemberCapacity } from "@/server/services/limits";
import { commitImport, previewImport } from "@/server/services/members";
import { parseCsv } from "@/lib/format";
import { DomainError } from "@/server/errors";
import { audit } from "@/server/services/audit";

const MAX_BYTES = 1_000_000;

/** POST multipart {file}; add ?commit=1 to import the valid rows. Always scoped to the caller's gym. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const commit = new URL(req.url).searchParams.get("commit") === "1";
    const ctx = await requirePermission("members", { write: commit });
    const file = (await req.formData()).get("file");
    if (!(file instanceof File)) return fail("Choose a CSV file.", 400);
    if (file.size > MAX_BYTES) return fail("File too large (max 1 MB).", 413);
    if (!/\.csv$/i.test(file.name) && !file.type.includes("csv") && !file.type.includes("text")) return fail("Only .csv files are supported.", 415);

    const preview = await previewImport(ctx.db, parseCsv(await file.text()));
    if (!commit) return json({ valid: preview.valid.length, invalid: preview.invalid.slice(0, 20), invalidCount: preview.invalid.length, duplicate: preview.duplicate.slice(0, 20), duplicateCount: preview.duplicate.length });

    await assertMemberCapacity(ctx.tenant, ctx.db, preview.valid.length);
    const created = await commitImport(ctx.db, ctx.tenant.id, preview);
    await audit({ tenantId: ctx.tenant.id, userId: ctx.user.id, action: "members.imported", meta: { created } });
    return json({ imported: created });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.message, 400);
    return handleError(e);
  }
}
