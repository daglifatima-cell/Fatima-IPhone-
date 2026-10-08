import { BriefForm } from "@/components/brief/BriefForm";
import { requireUser } from "@/lib/auth";
import { getOrCreateBrief } from "@/lib/brief";
import type { BriefData } from "@/lib/brief-schema";

export default async function EspacePage() {
  const ctx = await requireUser();
  const brief = await getOrCreateBrief(ctx);
  const firstName = ctx.profile.full_name?.split(" ")[0] ?? "";

  return (
    <BriefForm
      brief={{ id: brief.id, status: brief.status, data: brief.data as BriefData, submitted_at: brief.submitted_at }}
      userId={ctx.user.id}
      firstName={firstName}
    />
  );
}
