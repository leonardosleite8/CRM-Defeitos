import { AppShell } from "@/components/layout/AppShell";
import { getSession } from "@/lib/auth/getSession";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  return <AppShell user={user}>{children}</AppShell>;
}
