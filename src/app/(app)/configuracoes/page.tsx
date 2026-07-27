import { fetchConfigData } from "@/app/actions/auth";
import { ConfiguracoesClient } from "@/components/config/ConfiguracoesClient";

export default async function ConfiguracoesPage() {
  const data = await fetchConfigData();
  return <ConfiguracoesClient session={data.session} users={data.users} />;
}
