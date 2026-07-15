import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_contratos",
  title: "Listar contratos",
  description: "Lista contratos de renta. Permite filtrar por estatus y cliente.",
  inputSchema: {
    estatus: z.string().optional().describe("Estatus del contrato, ej. 'activo', 'finalizado'"),
    cliente: z.string().optional().describe("Filtro por nombre de cliente (parcial)"),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ estatus, cliente, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    let q = supabaseForUser(ctx)
      .from("contratos")
      .select("id, folio, cliente_nombre, obra, fecha_inicio, fecha_fin, estatus")
      .order("fecha_inicio", { ascending: false })
      .limit(limit ?? 20);
    if (estatus) q = q.eq("estatus", estatus);
    if (cliente) q = q.ilike("cliente_nombre", `%${cliente}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { contratos: data },
    };
  },
});
