import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "dp_session";

export type AppRole = "admin" | "user" | "observer";

export function parseAppRole(role: unknown): AppRole {
  if (role === "admin" || role === "observer" || role === "user") return role;
  return "user";
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: AppRole;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser, remember = false): Promise<string> {
  const exp = remember ? "30d" : "1d";
  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.id || !payload.email || !payload.name || !payload.role) return null;
    return {
      id: String(payload.id),
      email: String(payload.email),
      name: String(payload.name),
      role: parseAppRole(payload.role),
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(token: string, remember: boolean) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24,
  };
}
