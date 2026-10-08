import { MessageList } from "@/components/project/Messages";
import { Timeline } from "@/components/project/Timeline";
import { requireUser } from "@/lib/auth";
import { getOrCreateBrief } from "@/lib/brief";
import { loadMessages } from "@/lib/messages";
import { MaquetteReview, MessageComposer } from "./ClientActions";

export default async function SuiviPage() {
  const ctx = await requireUser();
  const brief = await getOrCreateBrief(ctx);
  const messages = await loadMessages(ctx.supabase, brief.id);
  const validated = messages.some((m) => m.kind === "validation");

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[340px_1fr]">
      <section className="card lg:self-start">
        <h1 className="mb-6 font-display text-2xl font-semibold">Avancement</h1>
        <Timeline current={brief.project_step} />
      </section>

      <div className="min-w-0 space-y-6">
        {brief.maquette_url && (
          <section className="card !p-6 sm:!p-8">
            <h2 className="font-display text-2xl font-semibold">Votre maquette est prête 🎨</h2>
            <p className="mt-1 text-muted">Prenez le temps de la parcourir, sur ordinateur et sur téléphone.</p>
            <a href={brief.maquette_url} target="_blank" rel="noreferrer" className="btn-primary mt-4">
              Voir la maquette ↗
            </a>
            <div className="mt-6 border-t border-line pt-6">
              {validated ? (
                <p className="font-semibold text-success">✅ Vous avez validé la maquette. Merci !</p>
              ) : (
                <MaquetteReview briefId={brief.id} />
              )}
            </div>
          </section>
        )}

        <section className="card !p-6 sm:!p-8">
          <h2 className="mb-4 font-display text-2xl font-semibold">Messages</h2>
          <MessageList messages={messages} viewer="client" />
          <div className="mt-6 border-t border-line pt-6">
            <MessageComposer briefId={brief.id} />
          </div>
        </section>
      </div>
    </div>
  );
}
