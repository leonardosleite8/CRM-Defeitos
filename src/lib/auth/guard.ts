import { getSession } from "@/lib/auth/getSession";
import type { SessionUser } from "@/lib/auth/session";

export async function assertCanMutate(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new Error("Faça login para alterar dados.");
  if (session.role === "observer") {
    throw new Error("O perfil Observador só pode visualizar.");
  }
  return session;
}
