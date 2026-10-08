import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { requireUser } from "@/lib/auth";
import { getOrCreateBrief } from "@/lib/brief";
import { STUDIO } from "@/lib/studio-config";
import { EspaceTabs } from "./EspaceTabs";

export default async function EspaceLayout({ children }: LayoutProps<"/espace">) {
  const ctx = await requireUser();
  const { profile } = ctx;
  if (profile.role === "admin") redirect("/admin");
  const brief = await getOrCreateBrief(ctx);

  return (
    <>
      <Header email={profile.email} home="/espace" />
      <EspaceTabs />
      <main className="flex-1">{children}</main>
      <AssistantChat
        name={STUDIO.assistantName}
        briefId={brief.id}
        locked={brief.status === "en_cours" || brief.status === "termine"}
      />
    </>
  );
}
