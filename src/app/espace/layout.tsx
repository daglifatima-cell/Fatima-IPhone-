import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { requireUser } from "@/lib/auth";
import { EspaceTabs } from "./EspaceTabs";

export default async function EspaceLayout({ children }: LayoutProps<"/espace">) {
  const { profile } = await requireUser();
  if (profile.role === "admin") redirect("/admin");

  return (
    <>
      <Header email={profile.email} home="/espace" />
      <EspaceTabs />
      <main className="flex-1">{children}</main>
    </>
  );
}
