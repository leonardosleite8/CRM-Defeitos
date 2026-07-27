import { redirect } from "next/navigation";
import { fetchLogsData } from "@/app/actions/auth";
import { LogsClient } from "@/components/config/LogsClient";

export default async function LogsPage() {
  try {
    const data = await fetchLogsData();
    return <LogsClient logs={data.logs} />;
  } catch {
    redirect("/");
  }
}
