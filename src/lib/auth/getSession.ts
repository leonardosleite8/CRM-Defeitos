import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken, type SessionUser } from "@/lib/auth/session";

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
