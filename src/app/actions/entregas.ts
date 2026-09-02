"use server";

import { getEntregasNoPeriodo, type EntregasPeriodoInput } from "@/lib/queries/boards";

export async function fetchEntregasAction(input: EntregasPeriodoInput) {
  return getEntregasNoPeriodo(input);
}
