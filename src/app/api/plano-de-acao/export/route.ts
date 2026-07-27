import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { writeAuditLog } from "@/lib/auth/users";
import { getCardDetail } from "@/lib/queries/boards";
import { buildPlanoExport } from "@/lib/plano/exportPlano";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = (await request.json()) as { cardIds?: string[] };
  const cardIds = Array.isArray(body.cardIds) ? body.cardIds.filter(Boolean) : [];
  if (!cardIds.length) {
    return NextResponse.json({ error: "Nenhum card selecionado." }, { status: 400 });
  }

  const items = [];
  for (const id of cardIds) {
    const detail = await getCardDetail(id);
    items.push({ card: detail.card, comments: detail.comments });
  }

  const linkSistema =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    request.headers.get("origin") ||
    "http://localhost:3000";

  const file = await buildPlanoExport(items, linkSistema);
  await writeAuditLog({
    user: session,
    action: "export_plano_acao",
    detail: `${cardIds.length} card(s)`,
  });

  return new NextResponse(new Uint8Array(file.buffer), {
    status: 200,
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${file.filename}"`,
    },
  });
}
