import { listCardsForPlano } from "@/lib/queries/plano";
import { PlanoDeAcaoClient } from "@/components/plano/PlanoDeAcaoClient";
import { ConfigAlert } from "@/components/ConfigAlert";

function hasEnv() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export default async function PlanoDeAcaoPage() {
  if (!hasEnv()) {
    return (
      <div className="mx-auto max-w-2xl">
        <ConfigAlert />
      </div>
    );
  }

  const cards = await listCardsForPlano();
  return <PlanoDeAcaoClient initialCards={cards} />;
}
