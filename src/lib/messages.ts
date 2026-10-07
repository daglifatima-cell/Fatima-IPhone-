import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectMessage } from "@/components/project/Messages";

export async function loadMessages(supabase: SupabaseClient, briefId: string): Promise<ProjectMessage[]> {
  const { data } = await supabase
    .from("project_messages")
    .select("id, kind, body, created_at, author:profiles(role, full_name)")
    .eq("brief_id", briefId)
    .order("created_at", { ascending: true })
    .returns<ProjectMessage[]>();
  return data ?? [];
}
